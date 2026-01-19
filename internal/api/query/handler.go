package query

import (
	"errors"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/yourusername/dataweaver/internal/model"
	"github.com/yourusername/dataweaver/internal/repository"
	"github.com/yourusername/dataweaver/internal/response"
	"github.com/yourusername/dataweaver/internal/service"
)

// Handler handles query API requests
type Handler struct {
	service service.QueryService
}

// NewHandler creates a new Handler
func NewHandler(svc service.QueryService) *Handler {
	return &Handler{service: svc}
}

// getUserID extracts user ID from context (set by JWT middleware)
func getUserID(c *gin.Context) uint {
	userID, exists := c.Get("user_id")
	if !exists {
		return 0
	}
	if id, ok := userID.(uint); ok {
		return id
	}
	if id, ok := userID.(float64); ok {
		return uint(id)
	}
	return 0
}

// List godoc
// @Summary List queries
// @Description Get a paginated list of queries for the current user
// @Tags Queries
// @Accept json
// @Produce json
// @Param page query int false "Page number" default(1)
// @Param size query int false "Page size" default(20)
// @Param keyword query string false "Search keyword"
// @Security BearerAuth
// @Success 200 {object} response.PagedResponse{data=[]model.QueryResponse}
// @Failure 401 {object} response.Response
// @Failure 500 {object} response.Response
// @Router /api/v1/queries [get]
func (h *Handler) List(c *gin.Context) {
	userID := getUserID(c)
	if userID == 0 {
		response.Unauthorized(c, "unauthorized")
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	size, _ := strconv.Atoi(c.DefaultQuery("size", "20"))
	keyword := c.Query("keyword")

	queries, total, err := h.service.List(userID, page, size, keyword)
	if err != nil {
		response.InternalError(c, err.Error())
		return
	}

	response.SuccessPaged(c, queries, total, page, size)
}

// Create godoc
// @Summary Create query
// @Description Create a new query
// @Tags Queries
// @Accept json
// @Produce json
// @Param request body model.CreateQueryRequest true "Query info"
// @Security BearerAuth
// @Success 201 {object} response.Response{data=model.QueryResponse}
// @Failure 400 {object} response.Response
// @Failure 401 {object} response.Response
// @Failure 500 {object} response.Response
// @Router /api/v1/queries [post]
func (h *Handler) Create(c *gin.Context) {
	userID := getUserID(c)
	if userID == 0 {
		response.Unauthorized(c, "unauthorized")
		return
	}

	var req model.CreateQueryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	query, err := h.service.Create(userID, &req)
	if err != nil {
		if errors.Is(err, service.ErrDataSourceNotFound) {
			response.NotFound(c, "data source not found")
			return
		}
		if errors.Is(err, service.ErrInvalidSQL) || errors.Is(err, service.ErrNonReadOnlySQL) {
			response.BadRequest(c, err.Error())
			return
		}
		response.InternalError(c, err.Error())
		return
	}

	response.Created(c, query)
}

// Get godoc
// @Summary Get query
// @Description Get a query by ID
// @Tags Queries
// @Accept json
// @Produce json
// @Param id path string true "Query ID"
// @Security BearerAuth
// @Success 200 {object} response.Response{data=model.QueryResponse}
// @Failure 400 {object} response.Response
// @Failure 401 {object} response.Response
// @Failure 404 {object} response.Response
// @Failure 500 {object} response.Response
// @Router /api/v1/queries/{id} [get]
func (h *Handler) Get(c *gin.Context) {
	userID := getUserID(c)
	if userID == 0 {
		response.Unauthorized(c, "unauthorized")
		return
	}

	id := c.Param("id")
	if id == "" {
		response.BadRequest(c, "query id is required")
		return
	}

	query, err := h.service.Get(id, userID)
	if err != nil {
		if errors.Is(err, repository.ErrQueryNotFound) {
			response.NotFound(c, "query not found")
			return
		}
		response.InternalError(c, err.Error())
		return
	}

	response.Success(c, query)
}

// Update godoc
// @Summary Update query
// @Description Update a query by ID
// @Tags Queries
// @Accept json
// @Produce json
// @Param id path string true "Query ID"
// @Param request body model.UpdateQueryRequest true "Query info"
// @Security BearerAuth
// @Success 200 {object} response.Response{data=model.QueryResponse}
// @Failure 400 {object} response.Response
// @Failure 401 {object} response.Response
// @Failure 404 {object} response.Response
// @Failure 500 {object} response.Response
// @Router /api/v1/queries/{id} [put]
func (h *Handler) Update(c *gin.Context) {
	userID := getUserID(c)
	if userID == 0 {
		response.Unauthorized(c, "unauthorized")
		return
	}

	id := c.Param("id")
	if id == "" {
		response.BadRequest(c, "query id is required")
		return
	}

	var req model.UpdateQueryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	query, err := h.service.Update(id, userID, &req)
	if err != nil {
		if errors.Is(err, repository.ErrQueryNotFound) {
			response.NotFound(c, "query not found")
			return
		}
		if errors.Is(err, service.ErrDataSourceNotFound) {
			response.NotFound(c, "data source not found")
			return
		}
		if errors.Is(err, service.ErrInvalidSQL) || errors.Is(err, service.ErrNonReadOnlySQL) {
			response.BadRequest(c, err.Error())
			return
		}
		response.InternalError(c, err.Error())
		return
	}

	response.Success(c, query)
}

// Delete godoc
// @Summary Delete query
// @Description Delete a query by ID
// @Tags Queries
// @Accept json
// @Produce json
// @Param id path string true "Query ID"
// @Security BearerAuth
// @Success 204
// @Failure 400 {object} response.Response
// @Failure 401 {object} response.Response
// @Failure 404 {object} response.Response
// @Failure 500 {object} response.Response
// @Router /api/v1/queries/{id} [delete]
func (h *Handler) Delete(c *gin.Context) {
	userID := getUserID(c)
	if userID == 0 {
		response.Unauthorized(c, "unauthorized")
		return
	}

	id := c.Param("id")
	if id == "" {
		response.BadRequest(c, "query id is required")
		return
	}

	err := h.service.Delete(id, userID)
	if err != nil {
		if errors.Is(err, repository.ErrQueryNotFound) {
			response.NotFound(c, "query not found")
			return
		}
		response.InternalError(c, err.Error())
		return
	}

	response.NoContent(c)
}

// Execute godoc
// @Summary Execute query
// @Description Execute a query with parameters
// @Tags Queries
// @Accept json
// @Produce json
// @Param id path string true "Query ID"
// @Param request body model.ExecuteQueryRequest true "Execution parameters"
// @Security BearerAuth
// @Success 200 {object} response.Response{data=model.ExecuteQueryResponse}
// @Failure 400 {object} response.Response
// @Failure 401 {object} response.Response
// @Failure 404 {object} response.Response
// @Failure 500 {object} response.Response
// @Router /api/v1/queries/{id}/execute [post]
func (h *Handler) Execute(c *gin.Context) {
	userID := getUserID(c)
	if userID == 0 {
		response.Unauthorized(c, "unauthorized")
		return
	}

	id := c.Param("id")
	if id == "" {
		response.BadRequest(c, "query id is required")
		return
	}

	var req model.ExecuteQueryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		// Allow empty body (no parameters required for some queries)
		req = model.ExecuteQueryRequest{Parameters: make(map[string]interface{})}
	}

	result, err := h.service.Execute(id, userID, &req)
	if err != nil {
		if errors.Is(err, repository.ErrQueryNotFound) {
			response.NotFound(c, "query not found")
			return
		}
		if errors.Is(err, service.ErrMissingParameters) {
			response.BadRequest(c, err.Error())
			return
		}
		if errors.Is(err, service.ErrQueryExecution) {
			response.BadRequest(c, err.Error())
			return
		}
		response.InternalError(c, err.Error())
		return
	}

	response.Success(c, result)
}

// Validate godoc
// @Summary Validate SQL
// @Description Validate SQL template syntax and check if it's read-only
// @Tags Queries
// @Accept json
// @Produce json
// @Param id path string true "Query ID"
// @Security BearerAuth
// @Success 200 {object} response.Response{data=model.ValidateSQLResponse}
// @Failure 400 {object} response.Response
// @Failure 401 {object} response.Response
// @Failure 404 {object} response.Response
// @Failure 500 {object} response.Response
// @Router /api/v1/queries/{id}/validate [post]
func (h *Handler) Validate(c *gin.Context) {
	userID := getUserID(c)
	if userID == 0 {
		response.Unauthorized(c, "unauthorized")
		return
	}

	id := c.Param("id")
	if id == "" {
		response.BadRequest(c, "query id is required")
		return
	}

	// Get the query
	query, err := h.service.Get(id, userID)
	if err != nil {
		if errors.Is(err, repository.ErrQueryNotFound) {
			response.NotFound(c, "query not found")
			return
		}
		response.InternalError(c, err.Error())
		return
	}

	// Validate the SQL
	result, err := h.service.ValidateSQL(query.SQLTemplate)
	if err != nil {
		response.InternalError(c, err.Error())
		return
	}

	response.Success(c, result)
}

// ValidateSQL godoc
// @Summary Validate SQL directly
// @Description Validate SQL template syntax and check if it's read-only (without saving)
// @Tags Queries
// @Accept json
// @Produce json
// @Param request body model.ValidateSQLRequest true "SQL template"
// @Security BearerAuth
// @Success 200 {object} response.Response{data=model.ValidateSQLResponse}
// @Failure 400 {object} response.Response
// @Failure 401 {object} response.Response
// @Failure 500 {object} response.Response
// @Router /api/v1/queries/validate [post]
func (h *Handler) ValidateSQL(c *gin.Context) {
	userID := getUserID(c)
	if userID == 0 {
		response.Unauthorized(c, "unauthorized")
		return
	}

	var req model.ValidateSQLRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	result, err := h.service.ValidateSQL(req.SQLTemplate)
	if err != nil {
		response.InternalError(c, err.Error())
		return
	}

	response.Success(c, result)
}

// GetParameters godoc
// @Summary Get query parameters
// @Description Get the parameters defined for a query
// @Tags Queries
// @Accept json
// @Produce json
// @Param id path string true "Query ID"
// @Security BearerAuth
// @Success 200 {object} response.Response{data=[]model.QueryParameter}
// @Failure 400 {object} response.Response
// @Failure 401 {object} response.Response
// @Failure 404 {object} response.Response
// @Failure 500 {object} response.Response
// @Router /api/v1/queries/{id}/parameters [get]
func (h *Handler) GetParameters(c *gin.Context) {
	userID := getUserID(c)
	if userID == 0 {
		response.Unauthorized(c, "unauthorized")
		return
	}

	id := c.Param("id")
	if id == "" {
		response.BadRequest(c, "query id is required")
		return
	}

	params, err := h.service.GetParameters(id, userID)
	if err != nil {
		if errors.Is(err, repository.ErrQueryNotFound) {
			response.NotFound(c, "query not found")
			return
		}
		response.InternalError(c, err.Error())
		return
	}

	response.Success(c, params)
}

// GetHistory godoc
// @Summary Get query execution history
// @Description Get execution history for all queries or a specific query
// @Tags Queries
// @Accept json
// @Produce json
// @Param queryId query string false "Query ID (optional, if not provided returns all history)"
// @Param page query int false "Page number" default(1)
// @Param pageSize query int false "Page size" default(20)
// @Security BearerAuth
// @Success 200 {object} response.PagedResponse{data=[]model.QueryExecutionResponse}
// @Failure 401 {object} response.Response
// @Failure 500 {object} response.Response
// @Router /api/v1/queries/history [get]
func (h *Handler) GetHistory(c *gin.Context) {
	userID := getUserID(c)
	if userID == 0 {
		response.Unauthorized(c, "unauthorized")
		return
	}

	queryID := c.Query("queryId")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "20"))

	history, total, err := h.service.GetExecutionHistory(userID, queryID, page, pageSize)
	if err != nil {
		response.InternalError(c, err.Error())
		return
	}

	response.SuccessPaged(c, history, total, page, pageSize)
}
