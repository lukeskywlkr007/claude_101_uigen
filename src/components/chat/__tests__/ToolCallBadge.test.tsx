import { test, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ToolCallBadge } from "../ToolCallBadge";

afterEach(() => {
  cleanup();
});

test("shows spinner and 'Creating App.jsx...' when state is call and command is create", () => {
  render(
    <ToolCallBadge
      toolName="str_replace_editor"
      args={{ command: "create", path: "/App.jsx" }}
      state="call"
    />
  );
  expect(screen.getByText("Creating App.jsx...")).toBeDefined();
});

test("shows green dot and label without ellipsis when state is result", () => {
  render(
    <ToolCallBadge
      toolName="str_replace_editor"
      args={{ command: "create", path: "/App.jsx" }}
      state="result"
      result="Success"
    />
  );
  expect(screen.getByText("Creating App.jsx")).toBeDefined();
  expect(screen.queryByText("Creating App.jsx...")).toBeNull();
});

test("shows 'Editing Card.jsx...' for str_replace command", () => {
  render(
    <ToolCallBadge
      toolName="str_replace_editor"
      args={{ command: "str_replace", path: "/components/Card.jsx" }}
      state="call"
    />
  );
  expect(screen.getByText("Editing Card.jsx...")).toBeDefined();
});

test("shows 'Deleting Card.jsx...' for file_manager delete", () => {
  render(
    <ToolCallBadge
      toolName="file_manager"
      args={{ command: "delete", path: "/components/Card.jsx" }}
      state="call"
    />
  );
  expect(screen.getByText("Deleting Card.jsx...")).toBeDefined();
});

test("shows 'Renaming Card.jsx' when file_manager rename is done", () => {
  render(
    <ToolCallBadge
      toolName="file_manager"
      args={{ command: "rename", path: "/components/Card.jsx", new_path: "/components/NewCard.jsx" }}
      state="result"
    />
  );
  expect(screen.getByText("Renaming Card.jsx")).toBeDefined();
});

test("falls back to toolName for unknown tools", () => {
  render(
    <ToolCallBadge
      toolName="unknown_tool"
      args={{}}
      state="call"
    />
  );
  expect(screen.getByText("unknown_tool...")).toBeDefined();
});
