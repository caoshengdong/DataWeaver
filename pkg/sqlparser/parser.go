package sqlparser

import (
	"fmt"
	"regexp"
	"strings"
)

// ParameterInfo represents information about a SQL parameter
type ParameterInfo struct {
	Name     string `json:"name"`
	Type     string `json:"type"` // string, number, boolean, date
	Position int    `json:"position"`
}

// ExtractParameters extracts all named parameters from a SQL template
// Supports :paramName syntax
func ExtractParameters(sql string) []string {
	re := regexp.MustCompile(`:(\w+)`)
	matches := re.FindAllStringSubmatch(sql, -1)

	// Use map to track unique parameters and preserve order
	seen := make(map[string]bool)
	var params []string

	for _, match := range matches {
		if len(match) > 1 {
			paramName := match[1]
			if !seen[paramName] {
				seen[paramName] = true
				params = append(params, paramName)
			}
		}
	}

	return params
}

// ExtractParametersWithInfo extracts parameters with additional metadata
func ExtractParametersWithInfo(sql string) []ParameterInfo {
	re := regexp.MustCompile(`:(\w+)`)
	matches := re.FindAllStringSubmatchIndex(sql, -1)

	seen := make(map[string]bool)
	var params []ParameterInfo
	position := 0

	for _, match := range matches {
		if len(match) >= 4 {
			paramName := sql[match[2]:match[3]]
			if !seen[paramName] {
				seen[paramName] = true
				position++
				params = append(params, ParameterInfo{
					Name:     paramName,
					Type:     inferParameterType(paramName),
					Position: position,
				})
			}
		}
	}

	return params
}

// inferParameterType attempts to infer parameter type from its name
func inferParameterType(name string) string {
	nameLower := strings.ToLower(name)

	// Date-related patterns
	datePatterns := []string{"date", "time", "created", "updated", "start", "end", "from", "to", "birth", "expire"}
	for _, pattern := range datePatterns {
		if strings.Contains(nameLower, pattern) {
			return "date"
		}
	}

	// Number-related patterns
	numberPatterns := []string{"id", "count", "num", "amount", "price", "qty", "quantity", "age", "year", "month", "day", "limit", "offset", "page", "size"}
	for _, pattern := range numberPatterns {
		if strings.Contains(nameLower, pattern) {
			return "number"
		}
	}

	// Boolean-related patterns
	boolPatterns := []string{"is_", "has_", "can_", "active", "enabled", "disabled", "flag", "status"}
	for _, pattern := range boolPatterns {
		if strings.Contains(nameLower, pattern) {
			return "boolean"
		}
	}

	// Default to string
	return "string"
}

// ReplaceParameters replaces named parameters with positional placeholders
// Returns the converted SQL, ordered parameter values, and any error
func ReplaceParameters(sql string, params map[string]interface{}, dbType string) (string, []interface{}, error) {
	if params == nil || len(params) == 0 {
		return sql, nil, nil
	}

	re := regexp.MustCompile(`:(\w+)`)
	matches := re.FindAllStringSubmatch(sql, -1)

	if len(matches) == 0 {
		return sql, nil, nil
	}

	// Track unique parameters in order
	paramOrder := make([]string, 0)
	seen := make(map[string]bool)
	for _, match := range matches {
		paramName := match[1]
		if !seen[paramName] {
			seen[paramName] = true
			paramOrder = append(paramOrder, paramName)
		}
	}

	// Build args in order and validate all parameters are provided
	args := make([]interface{}, 0, len(paramOrder))
	missingParams := make([]string, 0)

	for _, name := range paramOrder {
		if val, ok := params[name]; ok {
			args = append(args, val)
		} else {
			missingParams = append(missingParams, name)
		}
	}

	if len(missingParams) > 0 {
		return "", nil, fmt.Errorf("missing required parameters: %s", strings.Join(missingParams, ", "))
	}

	// Replace named parameters with positional placeholders
	convertedSQL := sql
	for i, name := range paramOrder {
		var placeholder string
		switch strings.ToLower(dbType) {
		case "postgresql", "postgres":
			placeholder = fmt.Sprintf("$%d", i+1)
		case "mysql", "oracle":
			placeholder = "?"
		case "sqlserver", "mssql":
			placeholder = fmt.Sprintf("@p%d", i+1)
		default:
			placeholder = "?"
		}
		// Replace all occurrences of this named parameter
		convertedSQL = strings.ReplaceAll(convertedSQL, ":"+name, placeholder)
	}

	return convertedSQL, args, nil
}

// ValidateReadOnlySQL validates that the SQL is a read-only query (SELECT only)
func ValidateReadOnlySQL(sql string) error {
	// Normalize the SQL: trim whitespace and convert to uppercase for checking
	normalized := strings.TrimSpace(strings.ToUpper(sql))

	// Remove leading comments
	normalized = removeComments(normalized)

	// Check if it starts with SELECT or WITH (for CTEs)
	if !strings.HasPrefix(normalized, "SELECT") && !strings.HasPrefix(normalized, "WITH") {
		return fmt.Errorf("only SELECT queries are allowed")
	}

	// Check for dangerous keywords that shouldn't be in a read-only query
	dangerousKeywords := []string{
		"INSERT ", "UPDATE ", "DELETE ", "DROP ", "TRUNCATE ",
		"ALTER ", "CREATE ", "GRANT ", "REVOKE ", "EXEC ",
		"EXECUTE ", "INTO ", // INTO can be used with SELECT INTO
	}

	for _, keyword := range dangerousKeywords {
		if strings.Contains(normalized, keyword) {
			// Special case: INTO is allowed in subqueries, but not as SELECT INTO
			if keyword == "INTO " && !strings.Contains(normalized, "SELECT ") {
				continue
			}
			// Check if INTO appears right after SELECT (SELECT INTO pattern)
			if keyword == "INTO " {
				selectIntoPattern := regexp.MustCompile(`SELECT\s+.*?\s+INTO\s+`)
				if !selectIntoPattern.MatchString(normalized) {
					continue
				}
			}
			return fmt.Errorf("forbidden keyword detected: %s", strings.TrimSpace(keyword))
		}
	}

	return nil
}

// removeComments removes SQL comments from the beginning of the query
func removeComments(sql string) string {
	result := sql

	// Remove single-line comments (-- comment)
	singleLineComment := regexp.MustCompile(`^--.*?(\n|$)`)
	for singleLineComment.MatchString(result) {
		result = singleLineComment.ReplaceAllString(result, "")
		result = strings.TrimSpace(result)
	}

	// Remove multi-line comments (/* comment */)
	multiLineComment := regexp.MustCompile(`^/\*.*?\*/`)
	for multiLineComment.MatchString(result) {
		result = multiLineComment.ReplaceAllString(result, "")
		result = strings.TrimSpace(result)
	}

	return strings.TrimSpace(result)
}

// ValidateSQLSyntax performs basic SQL syntax validation
func ValidateSQLSyntax(sql string) error {
	if strings.TrimSpace(sql) == "" {
		return fmt.Errorf("SQL template cannot be empty")
	}

	// Check for unbalanced parentheses
	openCount := strings.Count(sql, "(")
	closeCount := strings.Count(sql, ")")
	if openCount != closeCount {
		return fmt.Errorf("unbalanced parentheses: %d opening, %d closing", openCount, closeCount)
	}

	// Check for unbalanced quotes
	singleQuotes := strings.Count(sql, "'")
	if singleQuotes%2 != 0 {
		return fmt.Errorf("unbalanced single quotes")
	}

	// Check for common SQL syntax issues
	normalizedSQL := strings.ToUpper(strings.TrimSpace(sql))

	// Must have at least a SELECT keyword for read-only queries
	if !strings.Contains(normalizedSQL, "SELECT") && !strings.Contains(normalizedSQL, "WITH") {
		return fmt.Errorf("SQL must contain SELECT statement")
	}

	return nil
}

// CountParameters counts the number of unique parameters in a SQL template
func CountParameters(sql string) int {
	return len(ExtractParameters(sql))
}

// HasParameters checks if the SQL template contains any parameters
func HasParameters(sql string) bool {
	return CountParameters(sql) > 0
}

// ValidateParameters checks if all required parameters are provided
func ValidateParameters(sql string, params map[string]interface{}) error {
	requiredParams := ExtractParameters(sql)

	if len(requiredParams) == 0 {
		return nil
	}

	if params == nil {
		return fmt.Errorf("parameters required but none provided")
	}

	var missing []string
	for _, param := range requiredParams {
		if _, ok := params[param]; !ok {
			missing = append(missing, param)
		}
	}

	if len(missing) > 0 {
		return fmt.Errorf("missing required parameters: %s", strings.Join(missing, ", "))
	}

	return nil
}
