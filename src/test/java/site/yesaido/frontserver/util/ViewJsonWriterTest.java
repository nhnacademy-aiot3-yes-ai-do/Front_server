package site.yesaido.frontserver.util;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;

import static org.junit.jupiter.api.Assertions.*;

class ViewJsonWriterTest {

    private final ObjectMapper objectMapper = JsonMapper.builder().build();
    private final ViewJsonWriter viewJsonWriter = new ViewJsonWriter(objectMapper);

    private record SamplePayload(String name, String script) {
    }

    @Test
    @DisplayName("toJson - 특수문자가 없으면 일반 JSON을 그대로 반환한다")
    void toJsonWithoutSpecialCharacters() {
        String json = viewJsonWriter.toJson(new SamplePayload("mush", "ok"));

        assertEquals("{\"name\":\"mush\",\"script\":\"ok\"}", json);
    }

    @Test
    @DisplayName("toJson - '<' 문자를 \\u003c로 이스케이프한다")
    void toJsonEscapesLessThan() {
        String json = viewJsonWriter.toJson(new SamplePayload("a<b", "x"));

        assertTrue(json.contains("a\\u003cb"));
        assertFalse(json.contains("<"));
    }

    @Test
    @DisplayName("toJson - '>' 문자를 \\u003e로 이스케이프한다")
    void toJsonEscapesGreaterThan() {
        String json = viewJsonWriter.toJson(new SamplePayload("a>b", "x"));

        assertTrue(json.contains("a\\u003eb"));
        assertFalse(json.contains(">"));
    }

    @Test
    @DisplayName("toJson - '&' 문자를 \\u0026로 이스케이프한다")
    void toJsonEscapesAmpersand() {
        String json = viewJsonWriter.toJson(new SamplePayload("a&b", "x"));

        assertTrue(json.contains("a\\u0026b"));
        assertFalse(json.contains("&"));
    }

    @Test
    @DisplayName("toJson - </script> 태그가 그대로 노출되지 않도록 이스케이프한다")
    void toJsonEscapesScriptClosingTag() {
        String json = viewJsonWriter.toJson(new SamplePayload("</script>", "x"));

        assertFalse(json.contains("</script>"));
        assertTrue(json.contains("\\u003c/script\\u003e"));
    }

    @Test
    @DisplayName("toJson - U+2028(LINE SEPARATOR)를 이스케이프한다")
    void toJsonEscapesLineSeparator() {
        String json = viewJsonWriter.toJson(new SamplePayload("a\u2028b", "x"));

        assertTrue(json.contains("a\\u2028b"));
        assertFalse(json.contains("\u2028"));
    }

    @Test
    @DisplayName("toJson - U+2029(PARAGRAPH SEPARATOR)를 이스케이프한다")
    void toJsonEscapesParagraphSeparator() {
        String json = viewJsonWriter.toJson(new SamplePayload("a\u2029b", "x"));

        assertTrue(json.contains("a\\u2029b"));
        assertFalse(json.contains("\u2029"));
    }

    @Test
    @DisplayName("toJson - null 값은 문자열 \"null\"로 직렬화한다")
    void toJsonWithNullValue() {
        assertEquals("null", viewJsonWriter.toJson(null));
    }

    @Test
    @DisplayName("toScriptJson - toJson과 동일한 결과를 반환한다")
    void toScriptJsonDelegatesToToJson() {
        SamplePayload payload = new SamplePayload("a<b>c&d", "e");

        assertEquals(viewJsonWriter.toJson(payload), viewJsonWriter.toScriptJson(payload));
    }
}