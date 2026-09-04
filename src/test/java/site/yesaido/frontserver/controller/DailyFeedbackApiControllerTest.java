package site.yesaido.frontserver.controller;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import site.yesaido.frontserver.client.AiClient;
import site.yesaido.frontserver.common.ApiResponse;
import site.yesaido.frontserver.dto.ai.daily_feedback.DailyFeedbackResponse;
import site.yesaido.frontserver.exception.GlobalExceptionHandler;
import site.yesaido.frontserver.util.AuthCookieProvider;
import tools.jackson.databind.json.JsonMapper;

import java.time.LocalDate;
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class DailyFeedbackApiControllerTest {

    @Mock
    private AiClient aiClient;

    @Mock
    private AuthCookieProvider authCookieProvider;

    @InjectMocks
    private DailyFeedbackApiController controller;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        GlobalExceptionHandler exceptionHandler = new GlobalExceptionHandler(
                authCookieProvider,
                JsonMapper.builder().build()
        );
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(exceptionHandler)
                .build();
    }

    @Test
    @DisplayName("일일 피드백 조회 요청을 날짜와 재배지 ID 그대로 AI Client에 위임")
    void getDailyFeedbackDelegatesToAiClient() {
        Long cultivationId = 27L;
        LocalDate feedbackDate = LocalDate.of(2026, 9, 2);
        DailyFeedbackResponse feedback = new DailyFeedbackResponse(
                91L,
                cultivationId,
                feedbackDate,
                true,
                "온도와 습도가 안정적입니다.",
                LocalDateTime.of(2026, 9, 3, 0, 6)
        );
        ApiResponse<DailyFeedbackResponse> expected = new ApiResponse<>(true, "SUCCESS", feedback);
        when(aiClient.getDailyFeedback(cultivationId, feedbackDate)).thenReturn(expected);

        ApiResponse<DailyFeedbackResponse> result = controller.getDailyFeedback(
                cultivationId,
                feedbackDate
        );

        assertThat(result).isSameAs(expected);
        assertThat(result.data().feedbackDate()).isEqualTo(feedbackDate);
        assertThat(result.data().hasVisionAnalysis()).isTrue();
        verify(aiClient).getDailyFeedback(cultivationId, feedbackDate);
    }

    @Test
    @DisplayName("일일 피드백 조회 날짜 형식이 잘못되면 400 반환")
    void getDailyFeedbackRejectsInvalidDate() throws Exception {
        mockMvc.perform(get("/api/cultivations/27/daily-feedbacks/not-a-date"))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(aiClient);
    }
}
