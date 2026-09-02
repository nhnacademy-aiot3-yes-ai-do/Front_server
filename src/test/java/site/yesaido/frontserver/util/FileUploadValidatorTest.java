package site.yesaido.frontserver.util;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;
import site.yesaido.frontserver.exception.TooManyFilesException;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class FileUploadValidatorTest {

    private List<MultipartFile> filesOf(int count) {
        List<MultipartFile> files = new ArrayList<>();
        for (int i = 0; i < count; i++) {
            files.add(new MockMultipartFile("files", "photo" + i + ".jpg", "image/jpeg", new byte[]{1}));
        }
        return files;
    }

    @Test
    @DisplayName("validateInquiryPhotoCount - null 목록은 통과시킨다")
    void nullListPasses() {
        assertDoesNotThrow(() -> FileUploadValidator.validateInquiryPhotoCount(null));
    }

    @Test
    @DisplayName("validateInquiryPhotoCount - 빈 목록은 통과시킨다")
    void emptyListPasses() {
        assertDoesNotThrow(() -> FileUploadValidator.validateInquiryPhotoCount(List.of()));
    }

    @Test
    @DisplayName("validateInquiryPhotoCount - 최대 개수(5장)와 같으면 통과시킨다")
    void exactlyMaxCountPasses() {
        assertDoesNotThrow(() -> FileUploadValidator.validateInquiryPhotoCount(filesOf(FileUploadValidator.MAX_INQUIRY_PHOTO_COUNT)));
    }

    @Test
    @DisplayName("validateInquiryPhotoCount - 최대 개수를 초과하면 TooManyFilesException을 던진다")
    void exceedsMaxCountThrows() {
        List<MultipartFile> files = filesOf(FileUploadValidator.MAX_INQUIRY_PHOTO_COUNT + 1);

        TooManyFilesException exception = assertThrows(TooManyFilesException.class,
                () -> FileUploadValidator.validateInquiryPhotoCount(files));

        assertEquals("사진은 최대 5장까지 첨부할 수 있습니다.", exception.getMessage());
    }
}