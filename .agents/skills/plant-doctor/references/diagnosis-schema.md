# Diagnosis Output Schema

JSON Schema for validating the structured diagnosis output produced by the
plant-doctor skill.

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "PlantDoctorDiagnosis",
  "type": "object",
  "required": [
    "plant",
    "plant_confidence",
    "likely_issues",
    "what_i_cant_tell",
    "follow_up_questions",
    "treatment_steps",
    "when_to_get_help",
    "is_healthy",
    "safety_note"
  ],
  "properties": {
    "plant": {
      "type": ["string", "null"],
      "description": "Identified plant species, or null if unknown."
    },
    "plant_confidence": {
      "type": "string",
      "enum": ["low", "medium", "high"],
      "description": "Confidence in the plant identification."
    },
    "likely_issues": {
      "type": "array",
      "maxItems": 3,
      "items": {
        "type": "object",
        "required": ["name", "confidence", "reasoning", "category"],
        "properties": {
          "name": {
            "type": "string",
            "description": "Short name of the issue."
          },
          "confidence": {
            "type": "string",
            "enum": ["low", "medium", "high"]
          },
          "reasoning": {
            "type": "string",
            "maxLength": 150,
            "description": "Visual evidence observed in the photo."
          },
          "category": {
            "type": "string",
            "enum": ["disease", "pest", "nutrient_deficiency", "environmental_stress"]
          }
        }
      }
    },
    "what_i_cant_tell": {
      "type": "string",
      "description": "Limitations of photo-only diagnosis."
    },
    "follow_up_questions": {
      "type": "array",
      "maxItems": 3,
      "items": { "type": "string" }
    },
    "treatment_steps": {
      "type": "array",
      "maxItems": 3,
      "items": {
        "type": "object",
        "required": ["step", "cost", "urgency"],
        "properties": {
          "step": {
            "type": "string",
            "maxLength": 200
          },
          "cost": {
            "type": "string",
            "enum": ["free", "low", "medium"]
          },
          "urgency": {
            "type": "string",
            "enum": ["immediate", "this_week", "when_possible"]
          }
        }
      }
    },
    "when_to_get_help": {
      "type": "string",
      "description": "When the user should consult a professional."
    },
    "is_healthy": {
      "type": "boolean",
      "description": "True if the plant appears healthy."
    },
    "safety_note": {
      "type": "string",
      "description": "Must mention local agricultural extension office."
    }
  }
}
```
