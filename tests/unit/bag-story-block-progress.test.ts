import { verifiedBagStoryBlockIds } from "@/modules/vocabulary/utils/bag-story-block-progress";

it("verifies each new five-card block from the server cursor, not the browser", () => {
  const blocks = Array.from({ length: 5 }, (_, partIndex) => ({ id: `block-${partIndex}`, settings: { engine: "bag-story", version: 3, partIndex } }));
  expect(verifiedBagStoryBlockIds(blocks, 0, false)).toEqual([]);
  expect(verifiedBagStoryBlockIds(blocks, 4, false)).toEqual([]);
  expect(verifiedBagStoryBlockIds(blocks, 5, false)).toEqual(["block-0"]);
  expect(verifiedBagStoryBlockIds(blocks, 12, false)).toEqual(["block-0", "block-1"]);
  expect(verifiedBagStoryBlockIds(blocks, 25, true)).toEqual(blocks.map((block) => block.id));
  expect(verifiedBagStoryBlockIds(blocks, 0, true)).toEqual([]);
});

it("keeps old one-block lessons compatible without granting new blocks", () => {
  const old = [{ id: "legacy", settings: { engine: "bag-story", version: 2 } }];
  expect(verifiedBagStoryBlockIds(old, 1884, false)).toEqual([]);
  expect(verifiedBagStoryBlockIds(old, 1885, true)).toEqual(["legacy"]);
});

it("verifies two-card blocks in the final phrase-practice round", () => {
  const blocks = Array.from({ length: 5 }, (_, partIndex) => ({ id: `short-${partIndex}`, settings: { engine: "bag-story", version: 3, partIndex, stagesPerBlock: 2 } }));
  expect(verifiedBagStoryBlockIds(blocks, 1, false)).toEqual([]);
  expect(verifiedBagStoryBlockIds(blocks, 2, false)).toEqual(["short-0"]);
  expect(verifiedBagStoryBlockIds(blocks, 10, true)).toEqual(blocks.map((block) => block.id));
});
