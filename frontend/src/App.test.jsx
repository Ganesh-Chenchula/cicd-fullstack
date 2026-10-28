
/**
 * @vitest-environment jsdom
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import App from "./App";

describe("CI/CD dashboard", () => {
  it("renders the dashboard heading", () => {
    render(<App />);

    expect(
      screen.getByRole("heading", { name: "CI/CD Dashboard" })
    ).toBeInTheDocument();
  });
});
