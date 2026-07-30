package site.yesaido.frontserver.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import site.yesaido.frontserver.client.CultivationClient;
import site.yesaido.frontserver.dto.cultivation.request.CultivationCreateRequest;
import site.yesaido.frontserver.dto.cultivation.response.CultivationDetailResponse;
import site.yesaido.frontserver.dto.cultivation.response.CultivationSummaryResponse;
import site.yesaido.frontserver.util.LoginRequired;

import java.util.List;

@LoginRequired
@Controller
@RequiredArgsConstructor
@RequestMapping("/cultivations")
public class CultivationController {

    private final CultivationClient cultivationClient;

    @GetMapping
    public String list(Model model) {
        List<CultivationSummaryResponse> cultivations = cultivationClient.getCultivations().getBody();
        model.addAttribute("cultivations", cultivations);
        return "cultivation/list";
    }

    @GetMapping("/new")
    public String createForm() {
        return "cultivation/create";
    }

    @PostMapping
    public String createCultivation(@RequestParam String name, @RequestParam Long mushroomId) {
        cultivationClient.createCultivation(new CultivationCreateRequest(name, mushroomId));
        return "redirect:/cultivations";
    }

    @GetMapping("/{cultivation-id}")
    public String detail(@PathVariable("cultivation-id") Long cultivationId, Model model) {
        CultivationDetailResponse cultivation = cultivationClient.getDetailCultivation(cultivationId).getBody();
        model.addAttribute("cultivation", cultivation);
        return "dashboard/main";
    }

    @PostMapping("/{cultivation-id}/finish")
    public String finish(@PathVariable("cultivation-id") Long cultivationId) {
        cultivationClient.finishCultivation(cultivationId);
        return "redirect:/cultivations/" + cultivationId;
    }
}