package com.nexdecade.vms.controller;

import com.nexdecade.vms.dto.ApiResponse;
import com.nexdecade.vms.entity.User;
import com.nexdecade.vms.repository.UserRepository;
import com.nexdecade.vms.service.AuditLogService;
import com.nexdecade.vms.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserAdminController {

    private final UserService     service;
    private final UserRepository  userRepo;
    private final AuditLogService audit;

    @GetMapping
    public ResponseEntity<ApiResponse<List<User>>> getAll() {
        return ResponseEntity.ok(ApiResponse.ok(service.findAll()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<User>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(service.findById(id)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<User>> create(@RequestBody Map<String, Object> body, HttpServletRequest req) {
        User u = new User();
        u.setUsername((String) body.get("username"));
        u.setFullName((String) body.get("fullName"));
        u.setEmail((String) body.get("email"));
        u.setRole((String) body.get("role"));
        u.setPhone((String) body.get("phone"));
        u.setDepartment((String) body.get("department"));
        u.setStatus("active");
        String password = (String) body.getOrDefault("password", "Welcome@123");
        User saved = service.create(u, password);
        audit.log(user(), null, "Users", "Create User", "Created user " + saved.getUsername(), req.getRemoteAddr(), "success");
        return ResponseEntity.ok(ApiResponse.ok("User created", saved));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<User>> update(@PathVariable Long id, @RequestBody User u, HttpServletRequest req) {
        User updated = service.update(id, u);
        audit.log(user(), null, "Users", "Edit User", "Updated user " + updated.getUsername(), req.getRemoteAddr(), "success");
        return ResponseEntity.ok(ApiResponse.ok("User updated", updated));
    }

    @PatchMapping("/{id}/reset-password")
    public ResponseEntity<ApiResponse<Void>> resetPassword(@PathVariable Long id, @RequestBody Map<String, String> body, HttpServletRequest req) {
        service.resetPassword(id, body.get("password"));
        audit.log(user(), null, "Users", "Password Reset", "Reset password for user #" + id, req.getRemoteAddr(), "success");
        return ResponseEntity.ok(ApiResponse.ok("Password reset", null));
    }

    @PatchMapping("/{id}/toggle-status")
    public ResponseEntity<ApiResponse<User>> toggleStatus(@PathVariable Long id, HttpServletRequest req) {
        User u = service.toggleStatus(id);
        audit.log(user(), null, "Users", u.getStatus().equals("active") ? "Enable User" : "Disable User",
                "Set user " + u.getUsername() + " → " + u.getStatus(), req.getRemoteAddr(), "success");
        return ResponseEntity.ok(ApiResponse.ok("Status updated", u));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id, HttpServletRequest req) {
        User u = service.findById(id);
        service.delete(id);
        audit.log(user(), null, "Users", "Delete User", "Deleted user " + u.getUsername(), req.getRemoteAddr(), "success");
        return ResponseEntity.ok(ApiResponse.ok("User deleted", null));
    }

    /** POST /api/users/seed — inserts 50 sample employees; skips existing usernames/emails */
    @PostMapping("/seed")
    public ResponseEntity<ApiResponse<Map<String, Object>>> seed(HttpServletRequest req) {
        record E(String un, String name, String email, String phone, String dept, String role) {}
        // Departments: Billing, Customer Support, HR & Admin, IT, Sales
        var seeds = List.of(
            new E("r.islam",      "Rafiqul Islam",        "r.islam@nexdecade.com",      "01711-001001", "Sales",            "manager"),
            new E("k.hossain",    "Karim Hossain",        "k.hossain@nexdecade.com",    "01711-001002", "IT",               "operator"),
            new E("n.akter",      "Nasrin Akter",         "n.akter@nexdecade.com",      "01711-001003", "HR & Admin",       "manager"),
            new E("a.matin",      "Abdul Matin",          "a.matin@nexdecade.com",      "01711-001004", "Billing",          "manager"),
            new E("s.begum",      "Sultana Begum",        "s.begum@nexdecade.com",      "01711-001005", "HR & Admin",       "operator"),
            new E("m.rahman",     "Mizanur Rahman",       "m.rahman@nexdecade.com",     "01711-001006", "IT",               "operator"),
            new E("f.khanam",     "Farida Khanam",        "f.khanam@nexdecade.com",     "01711-001007", "Customer Support", "operator"),
            new E("h.ali",        "Harun Ali",            "h.ali@nexdecade.com",        "01711-001008", "Sales",            "operator"),
            new E("j.uddin",      "Jamal Uddin",          "j.uddin@nexdecade.com",      "01711-001009", "Billing",          "operator"),
            new E("p.roy",        "Prabir Roy",           "p.roy@nexdecade.com",        "01711-001010", "Billing",          "operator"),
            new E("t.chowdhury",  "Taslima Chowdhury",    "t.chowdhury@nexdecade.com",  "01711-001011", "HR & Admin",       "manager"),
            new E("b.sarkar",     "Babul Sarkar",         "b.sarkar@nexdecade.com",     "01711-001012", "IT",               "operator"),
            new E("m.hoque",      "Mahbubul Hoque",       "m.hoque@nexdecade.com",      "01711-001013", "Sales",            "manager"),
            new E("r.khatun",     "Rehana Khatun",        "r.khatun@nexdecade.com",     "01711-001014", "Customer Support", "operator"),
            new E("s.ahmed",      "Shafiqul Ahmed",       "s.ahmed@nexdecade.com",      "01711-001015", "Sales",            "operator"),
            new E("d.paul",       "Dipak Paul",           "d.paul@nexdecade.com",       "01711-001016", "IT",               "manager"),
            new E("l.begum",      "Laila Begum",          "l.begum@nexdecade.com",      "01711-001017", "Billing",          "operator"),
            new E("a.kabir",      "Abul Kabir",           "a.kabir@nexdecade.com",      "01711-001018", "Customer Support", "manager"),
            new E("m.karim",      "Mahmudul Karim",       "m.karim@nexdecade.com",      "01711-001019", "Sales",            "operator"),
            new E("n.islam",      "Nazrul Islam",         "n.islam@nexdecade.com",      "01711-001020", "IT",               "operator"),
            new E("r.alam",       "Rokeya Alam",          "r.alam@nexdecade.com",       "01711-001021", "HR & Admin",       "operator"),
            new E("s.khan",       "Selim Khan",           "s.khan@nexdecade.com",       "01711-001022", "Sales",            "operator"),
            new E("a.hossain",    "Anwar Hossain",        "a.hossain@nexdecade.com",    "01711-001023", "Billing",          "operator"),
            new E("m.sultana",    "Monira Sultana",       "m.sultana@nexdecade.com",    "01711-001024", "Customer Support", "operator"),
            new E("k.ahmed",      "Khurshid Ahmed",       "k.ahmed@nexdecade.com",      "01711-001025", "IT",               "manager"),
            new E("z.hossain",    "Zahirul Hossain",      "z.hossain@nexdecade.com",    "01711-001026", "Billing",          "operator"),
            new E("s.alam",       "Shahinur Alam",        "s.alam@nexdecade.com",       "01711-001027", "Sales",            "operator"),
            new E("f.ahmed",      "Faruk Ahmed",          "f.ahmed@nexdecade.com",      "01711-001028", "Customer Support", "operator"),
            new E("m.mia",        "Mostofa Mia",          "m.mia@nexdecade.com",        "01711-001029", "IT",               "operator"),
            new E("r.parvin",     "Rokhsana Parvin",      "r.parvin@nexdecade.com",     "01711-001030", "HR & Admin",       "operator"),
            new E("a.talukder",   "Aminul Talukder",      "a.talukder@nexdecade.com",   "01711-001031", "Billing",          "operator"),
            new E("g.biswas",     "Gour Biswas",          "g.biswas@nexdecade.com",     "01711-001032", "IT",               "operator"),
            new E("h.khatun",     "Hasina Khatun",        "h.khatun@nexdecade.com",     "01711-001033", "HR & Admin",       "manager"),
            new E("m.uddin",      "Mofazzal Uddin",       "m.uddin@nexdecade.com",      "01711-001034", "Customer Support", "manager"),
            new E("t.akter",      "Tahmina Akter",        "t.akter@nexdecade.com",      "01711-001035", "Billing",          "operator"),
            new E("s.molla",      "Sohrab Molla",         "s.molla@nexdecade.com",      "01711-001036", "Sales",            "operator"),
            new E("b.ahmed",      "Belal Ahmed",          "b.ahmed@nexdecade.com",      "01711-001037", "Customer Support", "operator"),
            new E("p.begum",      "Pervin Begum",         "p.begum@nexdecade.com",      "01711-001038", "HR & Admin",       "operator"),
            new E("r.hossain",    "Ripon Hossain",        "r.hossain@nexdecade.com",    "01711-001039", "IT",               "operator"),
            new E("m.islam2",     "Mainul Islam",         "m.islam2@nexdecade.com",     "01711-001040", "Sales",            "operator"),
            new E("k.akter",      "Kulsum Akter",         "k.akter@nexdecade.com",      "01711-001041", "Customer Support", "operator"),
            new E("a.sarker",     "Abdus Sarker",         "a.sarker@nexdecade.com",     "01711-001042", "Billing",          "operator"),
            new E("n.begum",      "Nasima Begum",         "n.begum@nexdecade.com",      "01711-001043", "HR & Admin",       "operator"),
            new E("s.biswas",     "Sumon Biswas",         "s.biswas@nexdecade.com",     "01711-001044", "IT",               "operator"),
            new E("m.hasan",      "Mehedi Hasan",         "m.hasan@nexdecade.com",      "01711-001045", "Sales",            "operator"),
            new E("f.khatun",     "Fatema Khatun",        "f.khatun@nexdecade.com",     "01711-001046", "Billing",          "operator"),
            new E("a.rahman2",    "Atiqur Rahman",        "a.rahman2@nexdecade.com",    "01711-001047", "Customer Support", "operator"),
            new E("s.hossain2",   "Saiful Hossain",       "s.hossain2@nexdecade.com",   "01711-001048", "IT",               "operator"),
            new E("r.mondal",     "Rina Mondal",          "r.mondal@nexdecade.com",     "01711-001049", "Sales",            "operator"),
            new E("m.chowdhury",  "Mamun Chowdhury",      "m.chowdhury@nexdecade.com",  "01711-001050", "HR & Admin",       "manager")
        );

        int created = 0; int skipped = 0;
        for (var s : seeds) {
            try {
                if (userRepo.existsByUsername(s.un()) || userRepo.existsByEmail(s.email())) { skipped++; continue; }
                User u = new User();
                u.setUsername(s.un()); u.setFullName(s.name()); u.setEmail(s.email());
                u.setPhone(s.phone()); u.setDepartment(s.dept()); u.setRole(s.role());
                u.setStatus("active");
                service.create(u, "Welcome@123");
                created++;
            } catch (Exception ignored) { skipped++; }
        }
        audit.log(user(), null, "Users", "Seed", created + " employees seeded", req.getRemoteAddr(), "success");
        return ResponseEntity.ok(ApiResponse.ok("Seeded " + created + " employees (" + skipped + " skipped)",
            Map.of("created", created, "skipped", skipped, "total", service.findAll().size())));
    }

    private String user() { return SecurityContextHolder.getContext().getAuthentication().getName(); }
}
