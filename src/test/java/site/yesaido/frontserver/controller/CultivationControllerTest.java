package site.yesaido.frontserver.controller;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.view;

@WebMvcTest(CultivationController.class)
class CultivationControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void createCultivationPageReturnsCreateView() throws Exception {
        mockMvc.perform(get("/cultivations/new"))
                .andExpect(status().isOk())
                .andExpect(view().name("cultivation/create"));
    }
}