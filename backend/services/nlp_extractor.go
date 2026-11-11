package services

import (
	"film-production-erp/models"
	"os"
	"regexp"
	"sort"
	"strings"
	"unicode"
)

// ExtractEntities processes scenes and extracts characters, locations, props,
// costumes and equipment. It will try to use the Gemini AI Orchestrator first,
// and fallback to the deterministic rule-based extractor if no API key is
// provided or the orchestrator call fails.
func ExtractEntities(productionID uint, scenes []models.Scene) []models.ProductionElement {
	// If GEMINI_API_KEY is present, use the Orchestrator
	if os.Getenv("GEMINI_API_KEY") != "" {
		orchestrator := NewAIOrchestrator()
		elements, err := orchestrator.RunExtractionPipeline(productionID, scenes)
		if err == nil && len(elements) > 0 {
			return elements
		}
		// If it failed for some reason, fallback to the rule-based extractor
	}

	return ExtractEntitiesRuleBased(productionID, scenes)
}

// Character cues may include initials and punctuation ("DR. SHARMA", "O'BRIEN").
var characterRegex = regexp.MustCompile(`^[A-Z0-9][A-Z0-9\s.'’\-]*$`)
var characterHasLetter = regexp.MustCompile(`[A-Z]`)

// Transition slugs are entire uppercase lines that are not character names.
// "THE FOLLOWING MORNING" matched the old cue regex and was a standing false positive.
var transitionCue = regexp.MustCompile(`\b(FOLLOWING|MORNING|LATER|CONTINUOUS|MOMENTS|FLASHBACK|FADE|DISSOLVE|INTERCUT|MONTAGE|CONTINUED|INSERT|SUPER|TITLE|CUT TO)\b`)

var capsPhraseRe = regexp.MustCompile(`\b[A-Z][A-Z0-9]*(?:\s+[A-Z][A-Z0-9]*)*\b`)

var capsStopwords = map[string]bool{
	"THE": true, "A": true, "AN": true, "AND": true, "OR": true, "OF": true,
	"TO": true, "IN": true, "ON": true, "AT": true, "BY": true, "FOR": true,
	"WITH": true, "FROM": true, "INTO": true, "HIS": true, "HER": true,
	"THEIR": true, "HE": true, "SHE": true, "THEY": true, "IT": true,
	"IS": true, "WAS": true, "ARE": true, "BUT": true, "NOT": true, "AS": true,
	"ITS": true, "OVER": true, "THEN": true, "ONCE": true, "OLD": true,
}

// Screenplays introduce a character in capitals on first appearance
// ("JUDGE KRISHNAMURTHY sits at the bench"). A capitalized action-line phrase
// containing one of these roles is a cast member, not a prop.
var roleNouns = map[string]bool{
	"officer": true, "judge": true, "advocate": true, "lawyer": true, "constable": true,
	"inspector": true, "sergeant": true, "commissioner": true, "doctor": true, "dr": true,
	"nurse": true, "guard": true, "guards": true, "servant": true, "priest": true,
	"teacher": true, "driver": true, "waiter": true, "porter": true, "soldier": true,
	"soldiers": true, "captain": true, "king": true, "queen": true, "prince": true,
	"princess": true, "minister": true, "stenographer": true, "clerk": true,
	"reporter": true, "anchor": true, "villager": true, "villagers": true, "farmer": true,
	"mother": true, "father": true, "grandmother": true, "grandfather": true,
	"henchman": true, "henchmen": true, "goon": true, "goons": true, "thug": true,
	"thugs": true, "assistant": true, "manager": true, "boss": true, "chief": true,
	"man": true, "woman": true, "boy": true, "girl": true, "mr": true, "mrs": true,
	"ms": true, "commander": true, "general": true, "counselor": true, "agent": true,
	"hacker": true, "warrior": true, "warriors": true, "detective": true,
}

// Honorific periods would split "DR. ANANYA ROY" into two capitalized phrases.
var honorificRe = regexp.MustCompile(`\b(DR|MR|MRS|MS)\.\s+`)

// glossaryItem is one production-object phrase. Longer phrases are matched
// first so "boom pole" does not also emit "pole".
type glossaryItem struct {
	Phrase string
	Type   string
	Name   string
	Re     *regexp.Regexp
}

var glossary []glossaryItem

func init() {
	type raw struct{ phrase, typ, name string }
	items := []raw{
		// Plural spellings that should merge with the singular entity. A blanket
		// plural rule would also match verbs ("watches", "ties", "rings").
		{"robes", "Costume", "Robe"}, {"knives", "Prop", "Knife"}, {"guns", "Prop", "Gun"},
		{"swords", "Prop", "Sword"}, {"rifles", "Prop", "Rifle"}, {"masks", "Costume", "Mask"},
		{"helmets", "Costume", "Helmet"}, {"uniforms", "Costume", "Uniform"},
		{"suitcases", "Prop", "Suitcase"}, {"bags", "Prop", "Bag"},
		{"bottles", "Prop", "Bottle"}, {"candles", "Prop", "Candle"},
	}
	for _, it := range []struct{ phrase, typ string }{
		// Props
		{"gun", "Prop"}, {"pistol", "Prop"}, {"revolver", "Prop"}, {"knife", "Prop"},
		{"sword", "Prop"}, {"car", "Prop"}, {"truck", "Prop"}, {"bike", "Prop"},
		{"motorcycle", "Prop"}, {"phone", "Prop"}, {"briefcase", "Prop"}, {"bag", "Prop"},
		{"letter", "Prop"}, {"bottle", "Prop"}, {"glass", "Prop"}, {"camera", "Prop"},
		{"laptop", "Prop"}, {"rope", "Prop"}, {"key", "Prop"}, {"box", "Prop"},
		{"umbrella", "Prop"}, {"watch", "Prop"}, {"ring", "Prop"}, {"newspaper", "Prop"},
		{"book", "Prop"}, {"suitcase", "Prop"}, {"torch", "Prop"}, {"flashlight", "Prop"},
		{"binoculars", "Prop"}, {"harmonica", "Prop"}, {"radio", "Prop"}, {"map", "Prop"},
		{"wallet", "Prop"}, {"photograph", "Prop"}, {"diary", "Prop"}, {"rifle", "Prop"},
		{"bomb", "Prop"}, {"chain", "Prop"}, {"lock", "Prop"}, {"candle", "Prop"},
		{"lantern", "Prop"}, {"pen", "Prop"}, {"envelope", "Prop"}, {"cigarette", "Prop"},
		{"file", "Prop"}, {"folder", "Prop"}, {"lamp", "Prop"}, {"drum", "Prop"},
		{"notes", "Prop"}, {"board", "Prop"}, {"ticket", "Prop"}, {"train", "Prop"},
		{"bucket", "Prop"}, {"pencil", "Prop"},
		// Costumes
		{"suit", "Costume"}, {"dress", "Costume"}, {"uniform", "Costume"}, {"jacket", "Costume"},
		{"coat", "Costume"}, {"gown", "Costume"}, {"armor", "Costume"}, {"armour", "Costume"},
		{"robe", "Costume"}, {"hat", "Costume"}, {"mask", "Costume"}, {"helmet", "Costume"},
		{"turban", "Costume"}, {"saree", "Costume"}, {"sari", "Costume"}, {"veil", "Costume"},
		{"cloak", "Costume"}, {"shawl", "Costume"}, {"boots", "Costume"}, {"gloves", "Costume"},
		{"bandana", "Costume"}, {"scarf", "Costume"}, {"shirt", "Costume"}, {"jeans", "Costume"},
		{"kurta", "Costume"}, {"dhoti", "Costume"}, {"cap", "Costume"}, {"tie", "Costume"},
		{"shoes", "Costume"}, {"sandals", "Costume"}, {"wig", "Costume"}, {"necklace", "Costume"},
		{"earrings", "Costume"}, {"blazer", "Costume"}, {"goggles", "Costume"}, {"crown", "Costume"},
		// Equipment. Multi-word phrases are listed beside their short forms;
		// init() sorts longest-first.
		{"crane", "Equipment"}, {"drone", "Equipment"}, {"jib", "Equipment"}, {"dolly", "Equipment"},
		{"rig", "Equipment"}, {"harness", "Equipment"}, {"wire", "Equipment"},
		{"greenscreen", "Equipment"}, {"green screen", "Equipment"}, {"generator", "Equipment"},
		{"tripod", "Equipment"}, {"gimbal", "Equipment"}, {"steadicam", "Equipment"},
		{"lighting", "Equipment"}, {"scaffolding", "Equipment"},
		{"winch", "Equipment"}, {"trolley", "Equipment"}, {"boom pole", "Equipment"},
		{"microphone", "Equipment"}, {"lapel mic", "Equipment"}, {"walkie-talkie", "Equipment"},
		{"walkie", "Equipment"}, {"mic", "Equipment"}, {"slider", "Equipment"},
		{"monitor", "Equipment"}, {"reflector", "Equipment"}, {"battery", "Equipment"},
		{"lens", "Equipment"}, {"microscope", "Equipment"}, {"teleprompter", "Equipment"},
		{"speaker", "Equipment"},
	} {
		items = append(items, raw{it.phrase, it.typ, titleWords(it.phrase)})
	}
	sort.SliceStable(items, func(i, j int) bool {
		return len(items[i].phrase) > len(items[j].phrase)
	})
	for _, it := range items {
		glossary = append(glossary, glossaryItem{
			Phrase: it.phrase,
			Type:   it.typ,
			Name:   it.name,
			Re:     regexp.MustCompile(`(?i)\b` + regexp.QuoteMeta(it.phrase) + `\b`),
		})
	}
}

func titleWords(s string) string {
	parts := strings.Fields(s)
	for i, p := range parts {
		if p == "" {
			continue
		}
		parts[i] = strings.ToUpper(p[:1]) + p[1:]
	}
	return strings.Join(parts, " ")
}

func isHeadingLine(line string) bool {
	return strings.Contains(line, "EXT.") || strings.Contains(line, "INT.")
}

func isTransitionSlug(line string) bool {
	if strings.ToUpper(line) != line || !characterHasLetter.MatchString(line) {
		return false
	}
	return transitionCue.MatchString(line)
}

func isCharacterCue(line string) bool {
	if isHeadingLine(line) || isTransitionSlug(line) {
		return false
	}
	if !characterRegex.MatchString(line) || !characterHasLetter.MatchString(line) {
		return false
	}
	if len(strings.Fields(line)) > 6 {
		return false
	}
	return true
}

func characterTokens(name string) []string {
	return strings.FieldsFunc(strings.ToLower(name), func(r rune) bool {
		return !unicode.IsLetter(r) && !unicode.IsNumber(r)
	})
}

// fallbackPropName turns an unmatched ALL-CAPS action phrase into a prop name.
// Stopwords and single letters ("A", "I") are dropped.
func fallbackPropName(phrase string) (string, bool) {
	var keep []string
	for _, w := range strings.Fields(phrase) {
		if capsStopwords[w] || len(w) < 2 {
			continue
		}
		keep = append(keep, w)
	}
	if len(keep) == 0 {
		return "", false
	}
	return titleWords(strings.ToLower(strings.Join(keep, " "))), true
}

// scriptBlock is one blank-line-separated paragraph of a scene. Wrapped
// lines are joined so a phrase split across a line break ("POLICE" /
// "UNIFORM") is matched as one phrase.
type scriptBlock struct {
	Cue      string // character cue, if the block is dialogue
	Text     string
	Dialogue bool
}

func sceneBlocks(content string) []scriptBlock {
	var blocks []scriptBlock
	var cur []string
	flush := func() {
		var lines []string
		for _, l := range cur {
			if isHeadingLine(l) || isTransitionSlug(l) {
				continue
			}
			lines = append(lines, l)
		}
		cur = nil
		if len(lines) == 0 {
			return
		}
		b := scriptBlock{}
		// A cue is the first line of a block that has dialogue under it.
		if len(lines) >= 2 && isCharacterCue(lines[0]) {
			b.Cue = lines[0]
			b.Dialogue = true
			lines = lines[1:]
		}
		var text []string
		for _, l := range lines {
			if strings.HasPrefix(l, "(") && strings.HasSuffix(l, ")") {
				continue
			}
			text = append(text, l)
		}
		b.Text = strings.Join(text, " ")
		blocks = append(blocks, b)
	}
	for _, line := range strings.Split(content, "\n") {
		trimmed := strings.TrimSpace(line)
		if trimmed == "" {
			flush()
			continue
		}
		cur = append(cur, trimmed)
	}
	flush()
	return blocks
}

func spansOverlap(a0, a1 int, spans [][2]int) bool {
	for _, s := range spans {
		if a0 < s[1] && s[0] < a1 {
			return true
		}
	}
	return false
}

// ExtractEntitiesRuleBased is the deterministic, offline extraction pass.
// It is the path the fixed ground-truth test scores.
//
// Final-evaluation changes, made because mid-semester recall was limited by
// a short keyword list and one transition-line false positive:
//  1. A character cue is the first line of a dialogue block. Cues may carry
//     initials ("DR. SHARMA"). Transition slugs are rejected.
//  2. Prop, costume, and equipment use a longer production glossary, with
//     multi-word phrases matched before the words inside them.
//  3. Capitalized action phrases the glossary does not know are classified:
//     a phrase naming a known character is skipped, a phrase with a role
//     noun ("JUDGE KRISHNAMURTHY") is a non-speaking character, and
//     anything else is a prop. Screenplays capitalize both character
//     introductions and significant objects, so the role check is what
//     stops introductions from being costed as props.
func ExtractEntitiesRuleBased(productionID uint, scenes []models.Scene) []models.ProductionElement {
	elementsMap := make(map[string]*models.ProductionElement)

	upsert := func(key, entType, name string, sceneID uint, dayIncrement float64) {
		if _, exists := elementsMap[key]; !exists {
			elementsMap[key] = &models.ProductionElement{
				ProductionID:   productionID,
				SceneID:        sceneID,
				Type:           entType,
				Name:           name,
				Mentions:       0,
				EstimatedDays:  0,
				IsAIExtracted:  true,
				IsUserVerified: false,
			}
		}
		elementsMap[key].Mentions++
		elementsMap[key].EstimatedDays += dayIncrement
	}

	blocksByScene := make([][]scriptBlock, len(scenes))
	charTok := map[string]bool{}
	for i, scene := range scenes {
		if scene.Location != "" {
			upsert("LOCATION:"+strings.ToUpper(scene.Location), "Location", scene.Location, scene.ID, 0.5)
		}
		blocksByScene[i] = sceneBlocks(scene.Content)
		for _, b := range blocksByScene[i] {
			if b.Cue == "" {
				continue
			}
			upsert("CHARACTER:"+b.Cue, "Character", b.Cue, scene.ID, 0.1)
			for _, tok := range characterTokens(b.Cue) {
				charTok[tok] = true
			}
		}
	}

	for i, scene := range scenes {
		for _, b := range blocksByScene[i] {
			text := b.Text
			if text == "" {
				continue
			}

			var covered [][2]int
			for _, g := range glossary {
				for _, span := range g.Re.FindAllStringIndex(text, -1) {
					// Longer phrases are tried first. A shorter hit inside
					// one of them (mic inside "lapel mic") is not a second entity.
					if spansOverlap(span[0], span[1], covered) {
						continue
					}
					covered = append(covered, [2]int{span[0], span[1]})
					upsert(g.Type+":"+strings.ToUpper(g.Name), g.Type, g.Name, scene.ID, 0.1)
				}
			}

			// Capitals in dialogue are emphasis, not a breakdown convention.
			if b.Dialogue {
				continue
			}
			text = honorificRe.ReplaceAllString(text, "$1 ")
			covered = nil
			for _, g := range glossary {
				for _, span := range g.Re.FindAllStringIndex(text, -1) {
					if !spansOverlap(span[0], span[1], covered) {
						covered = append(covered, [2]int{span[0], span[1]})
					}
				}
			}
			for _, span := range capsPhraseRe.FindAllStringIndex(text, -1) {
				if spansOverlap(span[0], span[1], covered) {
					continue
				}
				phrase := text[span[0]:span[1]]
				tokens := characterTokens(phrase)
				knownChar, role := false, false
				for _, tok := range tokens {
					if charTok[tok] {
						knownChar = true
					}
					if roleNouns[tok] {
						role = true
					}
				}
				switch {
				case knownChar:
					continue
				case role:
					var words []string
					for _, w := range strings.Fields(phrase) {
						if !capsStopwords[w] {
							words = append(words, w)
						}
					}
					name := strings.Join(words, " ")
					upsert("CHARACTER:"+name, "Character", name, scene.ID, 0.1)
					for _, tok := range tokens {
						charTok[tok] = true
					}
				default:
					if name, ok := fallbackPropName(phrase); ok {
						upsert("PROP:"+strings.ToUpper(name), "Prop", name, scene.ID, 0.1)
					}
				}
			}
		}
	}

	var elements []models.ProductionElement
	for _, el := range elementsMap {
		if el.EstimatedDays < 1 {
			el.EstimatedDays = 1
		}
		elements = append(elements, *el)
	}
	return elements
}
