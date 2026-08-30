package site.yesaido.frontserver.dto.user.response;


import java.time.LocalDateTime;

public record UserProfileResponse (
        Long id,
        String email,
        String nickname,
        String role,
        String status,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        boolean hasPassword
){
}
