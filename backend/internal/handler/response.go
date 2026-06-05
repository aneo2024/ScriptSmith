package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// Response 统一响应结构 — 所有 API 都按这个格式返回
type Response struct {
	Success bool        `json:"success"`
	Code    string      `json:"code"`
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
}

// OK 返回成功响应，data 为业务数据
//
//	用法：OK(c, work)          // { success: true, code: "ok", message: "成功", data: work }
//	用法：OK(c, gin.H{"works": works, "total": total})
//	用法：OK(c, nil)           // { success: true, code: "ok", message: "成功" }
func OK(c *gin.Context, data interface{}) {
	c.JSON(http.StatusOK, Response{
		Success: true,
		Code:    "ok",
		Message: "成功",
		Data:    data,
	})
}

// Created 返回 201 创建成功（注册/创建资源用）
func Created(c *gin.Context, data interface{}) {
	c.JSON(http.StatusCreated, Response{
		Success: true,
		Code:    "ok",
		Message: "创建成功",
		Data:    data,
	})
}

// OKWithStatus 返回成功，自定义 HTTP 状态码
func OKWithStatus(c *gin.Context, status int, data interface{}) {
	c.JSON(status, Response{
		Success: true,
		Code:    "ok",
		Message: "成功",
		Data:    data,
	})
}

// Error 返回错误响应 — 统一错误信息格式
//
//	用法：Error(c, http.StatusBadRequest, "invalid_input", "参数不合法")
//	用法：Error(c, http.StatusNotFound, "not_found", "资源不存在")
func Error(c *gin.Context, httpStatus int, code string, message string) {
	c.AbortWithStatusJSON(httpStatus, Response{
		Success: false,
		Code:    code,
		Message: message,
		Data:    nil,
	})
}

// ErrorBadRequest 400 — 参数不合法
func ErrorBadRequest(c *gin.Context, message string) {
	if message == "" {
		message = "参数不合法"
	}
	Error(c, http.StatusBadRequest, "invalid_input", message)
}

// ErrorUnauthorized 401 — 未认证/认证失败
func ErrorUnauthorized(c *gin.Context, message string) {
	if message == "" {
		message = "认证失败"
	}
	Error(c, http.StatusUnauthorized, "unauthorized", message)
}

// ErrorForbidden 403 — 无权限
func ErrorForbidden(c *gin.Context, message string) {
	if message == "" {
		message = "无权访问"
	}
	Error(c, http.StatusForbidden, "forbidden", message)
}

// ErrorNotFound 404 — 资源不存在
func ErrorNotFound(c *gin.Context, message string) {
	if message == "" {
		message = "资源不存在"
	}
	Error(c, http.StatusNotFound, "not_found", message)
}

// ErrorConflict 409 — 冲突（如用户名已存在）
func ErrorConflict(c *gin.Context, message string) {
	if message == "" {
		message = "资源冲突"
	}
	Error(c, http.StatusConflict, "conflict", message)
}

// ErrorInternal 500 — 服务器内部错误
func ErrorInternal(c *gin.Context, message string) {
	if message == "" {
		message = "服务器内部错误"
	}
	Error(c, http.StatusInternalServerError, "internal_error", message)
}
