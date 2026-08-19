package services

import (
	"encoding/json"
	"fmt"
	"log"
	"sync"

	"github.com/gin-gonic/gin"
)

// Event represents a message to be sent to SSE clients
type Event struct {
	Type    string      `json:"type"`
	Payload interface{} `json:"payload"`
}

// Client represents a connected SSE client
type Client struct {
	Chan chan Event
}

// SSEBroker manages connected clients and broadcasts events
type SSEBroker struct {
	mu          sync.RWMutex
	clients     map[uint]map[*Client]bool // Mapped by ProductionID
}

var GlobalBroker *SSEBroker

func init() {
	GlobalBroker = &SSEBroker{
		clients: make(map[uint]map[*Client]bool),
	}
}

// AddClient adds a new client listening to a specific production
func (b *SSEBroker) AddClient(productionID uint) *Client {
	b.mu.Lock()
	defer b.mu.Unlock()

	client := &Client{
		Chan: make(chan Event, 10),
	}

	if _, ok := b.clients[productionID]; !ok {
		b.clients[productionID] = make(map[*Client]bool)
	}
	b.clients[productionID][client] = true

	return client
}

// RemoveClient removes a client
func (b *SSEBroker) RemoveClient(productionID uint, client *Client) {
	b.mu.Lock()
	defer b.mu.Unlock()

	if clients, ok := b.clients[productionID]; ok {
		delete(clients, client)
		close(client.Chan)
		if len(clients) == 0 {
			delete(b.clients, productionID)
		}
	}
}

// Broadcast sends an event to all clients listening to a specific production
func (b *SSEBroker) Broadcast(productionID uint, eventType string, payload interface{}) {
	b.mu.RLock()
	defer b.mu.RUnlock()

	clients, ok := b.clients[productionID]
	if !ok {
		return
	}

	event := Event{
		Type:    eventType,
		Payload: payload,
	}

	for client := range clients {
		// Use a non-blocking send to prevent slow clients from blocking others
		select {
		case client.Chan <- event:
		default:
			log.Printf("Warning: Client channel full, dropping event for production %d", productionID)
		}
	}
}

// SSEHeaders middleware sets headers for SSE
func SSEHeaders() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Writer.Header().Set("Content-Type", "text/event-stream")
		c.Writer.Header().Set("Cache-Control", "no-cache")
		c.Writer.Header().Set("Connection", "keep-alive")
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Next()
	}
}

// StreamHandler handles the SSE connection
func StreamHandler(c *gin.Context) {
	prodIDStr := c.Param("productionId")
	var productionID uint
	fmt.Sscanf(prodIDStr, "%d", &productionID)

	if productionID == 0 {
		c.AbortWithStatus(400)
		return
	}

	client := GlobalBroker.AddClient(productionID)
	defer GlobalBroker.RemoveClient(productionID, client)

	// Send an initial connected event
	c.Writer.Write([]byte("event: connected\ndata: {}\n\n"))
	c.Writer.Flush()

	notify := c.Request.Context().Done()

	for {
		select {
		case <-notify:
			return
		case event := <-client.Chan:
			data, err := json.Marshal(event.Payload)
			if err != nil {
				continue
			}
			c.Writer.Write([]byte(fmt.Sprintf("event: %s\ndata: %s\n\n", event.Type, data)))
			c.Writer.Flush()
		}
	}
}
