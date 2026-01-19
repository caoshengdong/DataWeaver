package tool

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/yourusername/dataweaver/internal/model"
	"github.com/yourusername/dataweaver/internal/repository"
	"github.com/yourusername/dataweaver/internal/response"
	"github.com/yourusername/dataweaver/internal/service"
)

// Handler handles tool API requests
type Handler struct {
	toolService service.ToolService
}

// NewHandler creates a new tool handler
func NewHandler(toolService service.ToolService) *Handler {
	return &Handler{
		toolService: toolService,
	}
}

// getUserID extracts user ID from context
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

// Create creates a new tool
// @Summary Create a new tool
// @Description Create a new MCP tool with manual configuration
// @Tags tools
// @Accept json
// @Produce json
// @Security Bearer
// @Param request body model.CreateToolRequest true "Create tool request"
// @Success 201 {object} response.Response{data=model.ToolResponse}
// @Failure 400 {object} response.Response
// @Failure 401 {object} response.Response
// @Failure 409 {object} response.Response
// @Router /tools [post]
func (h *Handler) Create(c *gin.Context) {
	userID := getUserID(c)

	var req model.CreateToolRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	tool, err := h.toolService.Create(userID, &req)
	if err != nil {
		handleToolError(c, err)
		return
	}

	response.Created(c, tool)
}

// CreateFromQuery creates a tool from an existing query
// @Summary Create tool from query
// @Description Create a new MCP tool from an existing query with auto-generated settings
// @Tags tools
// @Accept json
// @Produce json
// @Security Bearer
// @Param query_id path string true "Query ID"
// @Param request body model.CreateToolFromQueryRequest true "Create tool from query request"
// @Success 201 {object} response.Response{data=model.ToolResponse}
// @Failure 400 {object} response.Response
// @Failure 401 {object} response.Response
// @Failure 404 {object} response.Response
// @Failure 409 {object} response.Response
// @Router /tools/from-query/{query_id} [post]
func (h *Handler) CreateFromQuery(c *gin.Context) {
	userID := getUserID(c)
	queryID := c.Param("query_id")

	var req model.CreateToolFromQueryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		// Allow empty body
		req = model.CreateToolFromQueryRequest{}
	}

	tool, err := h.toolService.CreateFromQuery(userID, queryID, &req)
	if err != nil {
		handleToolError(c, err)
		return
	}

	response.Created(c, tool)
}

// List returns all tools for the current user
// @Summary List tools
// @Description Get all tools for the current user with pagination and optional search
// @Tags tools
// @Produce json
// @Security Bearer
// @Param page query int false "Page number" default(1)
// @Param size query int false "Page size" default(20)
// @Param keyword query string false "Search keyword"
// @Success 200 {object} response.Response{data=response.PaginatedData{items=[]model.ToolResponse}}
// @Failure 401 {object} response.Response
// @Router /tools [get]
func (h *Handler) List(c *gin.Context) {
	userID := getUserID(c)

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	size, _ := strconv.Atoi(c.DefaultQuery("size", "20"))
	keyword := c.Query("keyword")

	tools, total, err := h.toolService.List(userID, page, size, keyword)
	if err != nil {
		response.InternalError(c, err.Error())
		return
	}

	response.SuccessPaged(c, tools, total, page, size)
}

// Get returns a tool by ID
// @Summary Get tool
// @Description Get a tool by ID
// @Tags tools
// @Produce json
// @Security Bearer
// @Param id path string true "Tool ID"
// @Success 200 {object} response.Response{data=model.ToolResponse}
// @Failure 401 {object} response.Response
// @Failure 404 {object} response.Response
// @Router /tools/{id} [get]
func (h *Handler) Get(c *gin.Context) {
	userID := getUserID(c)
	id := c.Param("id")

	tool, err := h.toolService.Get(id, userID)
	if err != nil {
		handleToolError(c, err)
		return
	}

	response.Success(c, tool)
}

// Update updates a tool
// @Summary Update tool
// @Description Update a tool by ID
// @Tags tools
// @Accept json
// @Produce json
// @Security Bearer
// @Param id path string true "Tool ID"
// @Param request body model.UpdateToolRequest true "Update tool request"
// @Success 200 {object} response.Response{data=model.ToolResponse}
// @Failure 400 {object} response.Response
// @Failure 401 {object} response.Response
// @Failure 404 {object} response.Response
// @Router /tools/{id} [put]
func (h *Handler) Update(c *gin.Context) {
	userID := getUserID(c)
	id := c.Param("id")

	var req model.UpdateToolRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	tool, err := h.toolService.Update(id, userID, &req)
	if err != nil {
		handleToolError(c, err)
		return
	}

	response.Success(c, tool)
}

// Delete deletes a tool
// @Summary Delete tool
// @Description Delete a tool by ID
// @Tags tools
// @Produce json
// @Security Bearer
// @Param id path string true "Tool ID"
// @Success 200 {object} response.Response
// @Failure 401 {object} response.Response
// @Failure 404 {object} response.Response
// @Router /tools/{id} [delete]
func (h *Handler) Delete(c *gin.Context) {
	userID := getUserID(c)
	id := c.Param("id")

	if err := h.toolService.Delete(id, userID); err != nil {
		handleToolError(c, err)
		return
	}

	response.Success(c, nil)
}

// TestTool tests a tool by executing its associated query
// @Summary Test tool
// @Description Test a tool by executing its associated query with provided parameters
// @Tags tools
// @Accept json
// @Produce json
// @Security Bearer
// @Param id path string true "Tool ID"
// @Param request body model.TestToolRequest true "Test tool request"
// @Success 200 {object} response.Response{data=model.TestToolResponse}
// @Failure 400 {object} response.Response
// @Failure 401 {object} response.Response
// @Failure 404 {object} response.Response
// @Router /tools/{id}/test [post]
func (h *Handler) TestTool(c *gin.Context) {
	userID := getUserID(c)
	id := c.Param("id")

	var req model.TestToolRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		// Allow empty body with empty parameters
		req = model.TestToolRequest{
			Parameters: make(map[string]interface{}),
		}
	}

	result, err := h.toolService.TestTool(id, userID, &req)
	if err != nil {
		handleToolError(c, err)
		return
	}

	response.Success(c, result)
}

// Export exports a tool in MCP format
// @Summary Export tool
// @Description Export a tool in MCP tool definition format
// @Tags tools
// @Produce json
// @Security Bearer
// @Param id path string true "Tool ID"
// @Success 200 {object} response.Response{data=model.MCPToolDefinition}
// @Failure 401 {object} response.Response
// @Failure 404 {object} response.Response
// @Router /tools/{id}/export [get]
func (h *Handler) Export(c *gin.Context) {
	userID := getUserID(c)
	id := c.Param("id")

	definition, err := h.toolService.Export(id, userID)
	if err != nil {
		handleToolError(c, err)
		return
	}

	response.Success(c, definition)
}

// ExportAll exports all active tools in MCP format
// @Summary Export all tools
// @Description Export all active tools in MCP tool definition format
// @Tags tools
// @Produce json
// @Security Bearer
// @Success 200 {object} response.Response{data=[]model.MCPToolDefinition}
// @Failure 401 {object} response.Response
// @Router /tools/export [get]
func (h *Handler) ExportAll(c *gin.Context) {
	userID := getUserID(c)

	definitions, err := h.toolService.ExportAll(userID)
	if err != nil {
		response.InternalError(c, err.Error())
		return
	}

	response.Success(c, definitions)
}

// GenerateDescription generates a description for a tool
// @Summary Generate description
// @Description Generate a description for a tool based on its query
// @Tags tools
// @Accept json
// @Produce json
// @Security Bearer
// @Param id path string true "Tool ID"
// @Param request body model.GenerateDescriptionRequest true "Generate description request"
// @Success 200 {object} response.Response{data=model.GenerateDescriptionResponse}
// @Failure 401 {object} response.Response
// @Failure 404 {object} response.Response
// @Router /tools/{id}/generate-description [post]
func (h *Handler) GenerateDescription(c *gin.Context) {
	userID := getUserID(c)
	id := c.Param("id")

	var req model.GenerateDescriptionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		req = model.GenerateDescriptionRequest{UseAI: false}
	}

	result, err := h.toolService.GenerateDescription(id, userID, &req)
	if err != nil {
		handleToolError(c, err)
		return
	}

	response.Success(c, result)
}

// handleToolError handles tool-specific errors
func handleToolError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, repository.ErrToolNotFound):
		response.NotFound(c, "Tool not found")
	case errors.Is(err, repository.ErrToolNameExists):
		response.Error(c, http.StatusConflict, "Tool name already exists")
	case errors.Is(err, service.ErrToolNameExists):
		response.Error(c, http.StatusConflict, "Tool name already exists")
	case errors.Is(err, service.ErrQueryRequired):
		response.BadRequest(c, "Query not found")
	case errors.Is(err, service.ErrInvalidToolName):
		response.BadRequest(c, "Invalid tool name format. Must be snake_case (lowercase letters, numbers, underscores)")
	default:
		response.InternalError(c, err.Error())
	}
}
