package sqlparser

import (
	"reflect"
	"testing"
)

func TestExtractParameters(t *testing.T) {
	tests := []struct {
		name     string
		sql      string
		expected []string
	}{
		{
			name:     "No parameters",
			sql:      "SELECT * FROM users",
			expected: nil,
		},
		{
			name:     "Single parameter",
			sql:      "SELECT * FROM users WHERE id = :user_id",
			expected: []string{"user_id"},
		},
		{
			name:     "Multiple parameters",
			sql:      "SELECT * FROM orders WHERE user_id = :user_id AND status = :status",
			expected: []string{"user_id", "status"},
		},
		{
			name:     "Duplicate parameters",
			sql:      "SELECT * FROM orders WHERE created_at >= :start_date AND updated_at >= :start_date",
			expected: []string{"start_date"},
		},
		{
			name:     "Complex query",
			sql:      "SELECT p.name, SUM(o.amount) FROM products p JOIN orders o ON p.id = o.product_id WHERE o.created_at BETWEEN :start_date AND :end_date AND p.category_id = :category_id GROUP BY p.name",
			expected: []string{"start_date", "end_date", "category_id"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := ExtractParameters(tt.sql)
			if !reflect.DeepEqual(result, tt.expected) {
				t.Errorf("ExtractParameters() = %v, want %v", result, tt.expected)
			}
		})
	}
}

func TestExtractParametersWithInfo(t *testing.T) {
	sql := "SELECT * FROM users WHERE user_id = :user_id AND created_at >= :start_date AND is_active = :is_active"
	result := ExtractParametersWithInfo(sql)

	if len(result) != 3 {
		t.Errorf("Expected 3 parameters, got %d", len(result))
	}

	// Check first parameter
	if result[0].Name != "user_id" || result[0].Type != "number" {
		t.Errorf("Expected user_id/number, got %s/%s", result[0].Name, result[0].Type)
	}

	// Check second parameter
	if result[1].Name != "start_date" || result[1].Type != "date" {
		t.Errorf("Expected start_date/date, got %s/%s", result[1].Name, result[1].Type)
	}

	// Check third parameter
	if result[2].Name != "is_active" || result[2].Type != "boolean" {
		t.Errorf("Expected is_active/boolean, got %s/%s", result[2].Name, result[2].Type)
	}
}

func TestReplaceParameters(t *testing.T) {
	tests := []struct {
		name        string
		sql         string
		params      map[string]interface{}
		dbType      string
		expectedSQL string
		expectedErr bool
	}{
		{
			name:        "PostgreSQL style",
			sql:         "SELECT * FROM users WHERE id = :user_id AND status = :status",
			params:      map[string]interface{}{"user_id": 1, "status": "active"},
			dbType:      "postgresql",
			expectedSQL: "SELECT * FROM users WHERE id = $1 AND status = $2",
			expectedErr: false,
		},
		{
			name:        "MySQL style",
			sql:         "SELECT * FROM users WHERE id = :user_id AND status = :status",
			params:      map[string]interface{}{"user_id": 1, "status": "active"},
			dbType:      "mysql",
			expectedSQL: "SELECT * FROM users WHERE id = ? AND status = ?",
			expectedErr: false,
		},
		{
			name:        "MSSQL style",
			sql:         "SELECT * FROM users WHERE id = :user_id AND status = :status",
			params:      map[string]interface{}{"user_id": 1, "status": "active"},
			dbType:      "mssql",
			expectedSQL: "SELECT * FROM users WHERE id = @p1 AND status = @p2",
			expectedErr: false,
		},
		{
			name:        "Missing parameter",
			sql:         "SELECT * FROM users WHERE id = :user_id AND status = :status",
			params:      map[string]interface{}{"user_id": 1},
			dbType:      "postgresql",
			expectedSQL: "",
			expectedErr: true,
		},
		{
			name:        "No parameters",
			sql:         "SELECT * FROM users",
			params:      nil,
			dbType:      "postgresql",
			expectedSQL: "SELECT * FROM users",
			expectedErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, _, err := ReplaceParameters(tt.sql, tt.params, tt.dbType)
			if (err != nil) != tt.expectedErr {
				t.Errorf("ReplaceParameters() error = %v, wantErr %v", err, tt.expectedErr)
				return
			}
			if !tt.expectedErr && result != tt.expectedSQL {
				t.Errorf("ReplaceParameters() = %v, want %v", result, tt.expectedSQL)
			}
		})
	}
}

func TestValidateReadOnlySQL(t *testing.T) {
	tests := []struct {
		name        string
		sql         string
		expectError bool
	}{
		{
			name:        "Valid SELECT",
			sql:         "SELECT * FROM users",
			expectError: false,
		},
		{
			name:        "Valid SELECT with JOIN",
			sql:         "SELECT u.name, o.amount FROM users u JOIN orders o ON u.id = o.user_id",
			expectError: false,
		},
		{
			name:        "Valid WITH clause (CTE)",
			sql:         "WITH active_users AS (SELECT * FROM users WHERE is_active = true) SELECT * FROM active_users",
			expectError: false,
		},
		{
			name:        "INSERT not allowed",
			sql:         "INSERT INTO users (name) VALUES ('test')",
			expectError: true,
		},
		{
			name:        "UPDATE not allowed",
			sql:         "UPDATE users SET name = 'test' WHERE id = 1",
			expectError: true,
		},
		{
			name:        "DELETE not allowed",
			sql:         "DELETE FROM users WHERE id = 1",
			expectError: true,
		},
		{
			name:        "DROP not allowed",
			sql:         "DROP TABLE users",
			expectError: true,
		},
		{
			name:        "TRUNCATE not allowed",
			sql:         "TRUNCATE TABLE users",
			expectError: true,
		},
		{
			name:        "CREATE not allowed",
			sql:         "CREATE TABLE test (id INT)",
			expectError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidateReadOnlySQL(tt.sql)
			if (err != nil) != tt.expectError {
				t.Errorf("ValidateReadOnlySQL() error = %v, wantErr %v", err, tt.expectError)
			}
		})
	}
}

func TestValidateSQLSyntax(t *testing.T) {
	tests := []struct {
		name        string
		sql         string
		expectError bool
	}{
		{
			name:        "Valid SQL",
			sql:         "SELECT * FROM users WHERE id = :id",
			expectError: false,
		},
		{
			name:        "Empty SQL",
			sql:         "",
			expectError: true,
		},
		{
			name:        "Whitespace only",
			sql:         "   ",
			expectError: true,
		},
		{
			name:        "Unbalanced parentheses",
			sql:         "SELECT * FROM users WHERE (id = 1",
			expectError: true,
		},
		{
			name:        "Unbalanced quotes",
			sql:         "SELECT * FROM users WHERE name = 'test",
			expectError: true,
		},
		{
			name:        "No SELECT",
			sql:         "DESCRIBE users",
			expectError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidateSQLSyntax(tt.sql)
			if (err != nil) != tt.expectError {
				t.Errorf("ValidateSQLSyntax() error = %v, wantErr %v", err, tt.expectError)
			}
		})
	}
}

func TestValidateParameters(t *testing.T) {
	tests := []struct {
		name        string
		sql         string
		params      map[string]interface{}
		expectError bool
	}{
		{
			name:        "All parameters provided",
			sql:         "SELECT * FROM users WHERE id = :user_id AND status = :status",
			params:      map[string]interface{}{"user_id": 1, "status": "active"},
			expectError: false,
		},
		{
			name:        "Missing parameter",
			sql:         "SELECT * FROM users WHERE id = :user_id AND status = :status",
			params:      map[string]interface{}{"user_id": 1},
			expectError: true,
		},
		{
			name:        "No parameters needed",
			sql:         "SELECT * FROM users",
			params:      nil,
			expectError: false,
		},
		{
			name:        "Parameters needed but none provided",
			sql:         "SELECT * FROM users WHERE id = :user_id",
			params:      nil,
			expectError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidateParameters(tt.sql, tt.params)
			if (err != nil) != tt.expectError {
				t.Errorf("ValidateParameters() error = %v, wantErr %v", err, tt.expectError)
			}
		})
	}
}

func TestCountParameters(t *testing.T) {
	tests := []struct {
		name     string
		sql      string
		expected int
	}{
		{
			name:     "No parameters",
			sql:      "SELECT * FROM users",
			expected: 0,
		},
		{
			name:     "One parameter",
			sql:      "SELECT * FROM users WHERE id = :user_id",
			expected: 1,
		},
		{
			name:     "Two parameters",
			sql:      "SELECT * FROM users WHERE id = :user_id AND status = :status",
			expected: 2,
		},
		{
			name:     "Duplicate parameters counted once",
			sql:      "SELECT * FROM users WHERE created_at >= :date AND updated_at >= :date",
			expected: 1,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := CountParameters(tt.sql)
			if result != tt.expected {
				t.Errorf("CountParameters() = %v, want %v", result, tt.expected)
			}
		})
	}
}

func TestHasParameters(t *testing.T) {
	tests := []struct {
		name     string
		sql      string
		expected bool
	}{
		{
			name:     "Has parameters",
			sql:      "SELECT * FROM users WHERE id = :user_id",
			expected: true,
		},
		{
			name:     "No parameters",
			sql:      "SELECT * FROM users",
			expected: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := HasParameters(tt.sql)
			if result != tt.expected {
				t.Errorf("HasParameters() = %v, want %v", result, tt.expected)
			}
		})
	}
}
