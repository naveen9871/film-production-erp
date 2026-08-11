package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"os"
	"strings"
	"time"
)

type AIClient struct {
	APIKey string
	Model  string
	Client *http.Client
}

func NewAIClient() *AIClient {
	apiKey := os.Getenv("GEMINI_API_KEY")
	model := "gemini-1.5-flash"

	return &AIClient{
		APIKey: apiKey,
		Model:  model,
		Client: &http.Client{
			Timeout: 60 * time.Second,
		},
	}
}

// GenerateContent calls the Gemini API with the given prompt and extracts JSON
func (c *AIClient) GenerateContent(prompt string) (string, error) {
	if c.APIKey == "" {
		return "", fmt.Errorf("GEMINI_API_KEY not configured")
	}

	url := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s", c.Model, c.APIKey)

	payload := map[string]interface{}{
		"contents": []map[string]interface{}{
			{
				"parts": []map[string]interface{}{
					{"text": prompt},
				},
			},
		},
		"generationConfig": map[string]interface{}{
			"temperature":     0.3,
			"maxOutputTokens": 8192,
			"responseMimeType": "application/json",
		},
	}

	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		return "", err
	}

	var lastErr error
	for i := 0; i < 3; i++ {
		req, err := http.NewRequest("POST", url, bytes.NewBuffer(payloadBytes))
		if err != nil {
			return "", err
		}
		req.Header.Set("Content-Type", "application/json")

		resp, err := c.Client.Do(req)
		if err != nil {
			lastErr = err
			time.Sleep(time.Duration(1<<i) * time.Second) // exponential backoff
			continue
		}
		defer resp.Body.Close()

		bodyBytes, err := ioutil.ReadAll(resp.Body)
		if err != nil {
			lastErr = err
			time.Sleep(time.Duration(1<<i) * time.Second)
			continue
		}

		if resp.StatusCode != http.StatusOK {
			lastErr = fmt.Errorf("API error: status %d, body: %s", resp.StatusCode, string(bodyBytes))
			time.Sleep(time.Duration(1<<i) * time.Second)
			continue
		}

		var result map[string]interface{}
		if err := json.Unmarshal(bodyBytes, &result); err != nil {
			lastErr = err
			time.Sleep(time.Duration(1<<i) * time.Second)
			continue
		}

		// Extract text from Gemini response structure
		if candidates, ok := result["candidates"].([]interface{}); ok && len(candidates) > 0 {
			if candidate, ok := candidates[0].(map[string]interface{}); ok {
				if content, ok := candidate["content"].(map[string]interface{}); ok {
					if parts, ok := content["parts"].([]interface{}); ok && len(parts) > 0 {
						if part, ok := parts[0].(map[string]interface{}); ok {
							if text, ok := part["text"].(string); ok {
								// Clean up markdown block if present
								text = strings.TrimPrefix(text, "```json\n")
								text = strings.TrimPrefix(text, "```\n")
								text = strings.TrimSuffix(text, "\n```")
								text = strings.TrimSuffix(text, "```")
								return text, nil
							}
						}
					}
				}
			}
		}

		lastErr = fmt.Errorf("unexpected response format")
		break // If we get here, it's not a network error but a parsing error, don't retry blindly
	}

	return "", lastErr
}
