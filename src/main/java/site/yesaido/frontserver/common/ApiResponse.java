package site.yesaido.frontserver.common;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record ApiResponse<T> (
   boolean success,
   String message,
   T data
){ }

