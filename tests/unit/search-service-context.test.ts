import { SearchService } from "@/modules/search/services/search.service";

describe("search service context access", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it("downgrades teacher context to public for anonymous user", async () => {
    const publicSpy = jest.spyOn(SearchService, "searchPublic").mockResolvedValue([]);
    const teacherSpy = jest.spyOn(SearchService, "searchForTeacher").mockResolvedValue([]);
    const result = await SearchService.searchAll({
      principal: { userId: null, role: null, locale: "en" },
      query: "english",
      requestedContext: "TEACHER",
    });

    expect(result.context).toBe("PUBLIC");
    expect(publicSpy).toHaveBeenCalled();
    expect(teacherSpy).not.toHaveBeenCalled();
  });

  it("downgrades teacher context to student for student role", async () => {
    const studentSpy = jest.spyOn(SearchService, "searchForStudent").mockResolvedValue([]);
    const teacherSpy = jest.spyOn(SearchService, "searchForTeacher").mockResolvedValue([]);
    const result = await SearchService.searchAll({
      principal: { userId: "s1", role: "student", locale: "en" },
      query: "english",
      requestedContext: "TEACHER",
    });

    expect(result.context).toBe("STUDENT");
    expect(studentSpy).toHaveBeenCalled();
    expect(teacherSpy).not.toHaveBeenCalled();
  });

  it("downgrades student context to teacher for teacher role", async () => {
    const teacherSpy = jest.spyOn(SearchService, "searchForTeacher").mockResolvedValue([]);
    const studentSpy = jest.spyOn(SearchService, "searchForStudent").mockResolvedValue([]);
    const result = await SearchService.searchAll({
      principal: { userId: "t1", role: "teacher", locale: "en" },
      query: "english",
      requestedContext: "STUDENT",
    });

    expect(result.context).toBe("TEACHER");
    expect(teacherSpy).toHaveBeenCalled();
    expect(studentSpy).not.toHaveBeenCalled();
  });

  it("keeps admin context for admin role", async () => {
    const publicSpy = jest.spyOn(SearchService, "searchPublic").mockResolvedValue([]);
    const result = await SearchService.searchAll({
      principal: { userId: "a1", role: "admin", locale: "en" },
      query: "english",
      requestedContext: "ADMIN",
    });

    expect(result.context).toBe("ADMIN");
    expect(publicSpy).not.toHaveBeenCalled();
    expect(result.items).toEqual([]);
  });
});
