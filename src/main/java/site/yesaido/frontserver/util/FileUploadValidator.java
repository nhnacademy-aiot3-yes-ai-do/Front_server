package site.yesaido.frontserver.util;

import org.springframework.web.multipart.MultipartFile;
import site.yesaido.frontserver.exception.TooManyFilesException;

import java.util.List;

public final class FileUploadValidator {
    public static final int MAX_INQUIRY_PHOTO_COUNT = 5;

    private FileUploadValidator() {
    }

    public static void validateInquiryPhotoCount(List<MultipartFile> files) {
        if (files != null && files.size() > MAX_INQUIRY_PHOTO_COUNT) {
            throw new TooManyFilesException("사진은 최대 " + MAX_INQUIRY_PHOTO_COUNT + "장까지 첨부할 수 있습니다.");
        }
    }
}