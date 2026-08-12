import { collectCurriculumDescendantIds } from "@/modules/courses/utils/public-content-routes";

describe("public curriculum isolation", () => {
  const nodes = [
    { id: "a1-grammar", parentId: null },
    { id: "a1-present", parentId: "a1-grammar" },
    { id: "a1-positive", parentId: "a1-present" },
    { id: "a2-grammar", parentId: null },
    { id: "a2-present", parentId: "a2-grammar" },
  ];

  it("returns the selected A1 subtree and never a same-named A2 node", () => {
    expect(collectCurriculumDescendantIds(nodes, "a1-grammar")).toEqual(["a1-grammar", "a1-present", "a1-positive"]);
  });

  it("does not substitute a parent or sibling when the selected node is unknown", () => {
    expect(collectCurriculumDescendantIds(nodes, "unknown")).toEqual(["unknown"]);
    expect(collectCurriculumDescendantIds(nodes, "a2-grammar")).toEqual(["a2-grammar", "a2-present"]);
  });
});
