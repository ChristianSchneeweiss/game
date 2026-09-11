// Integration tests load browser and Worker declarations together. The Worker
// HTMLRewriter Element.append declaration shadows DOM ParentNode.append;
// retain the browser overload for the happy-dom documents used by these tests.
interface Element {
  append(...nodes: (Node | string)[]): void;
}
