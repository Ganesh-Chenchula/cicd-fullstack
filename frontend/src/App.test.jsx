
/**
 * @vitest-environment jsdom
 */

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  cleanup,
  render,
  screen,
} from "@testing-library/react";

import "@testing-library/jest-dom/vitest";
import App from "./App";

describe("CI/CD Dashboard", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("Network error"))
    );
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("renders the dashboard heading", () => {
    render(<App />);

    expect(
      screen.getByRole("heading", {
        name: "My First CI/CD Pipeline",
      })
    ).toBeInTheDocument();
  });

  it("renders the backend status section", () => {
    render(<App />);

    expect(
      screen.getByRole("heading", {
        name: "Backend status",
      })
    ).toBeInTheDocument();
  });

  it("renders the project description", () => {
    render(<App />);

    expect(
      screen.getByText(
        "React frontend connected to a Django REST API."
      )
    ).toBeInTheDocument();
  });

  it("shows the successful backend response", async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        status: "ok",
        message: "Django API is running",
      }),
    });

    render(<App />);

    expect(
      await screen.findByText("Django API is running")
    ).toBeInTheDocument();

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0][0]).toContain("/api/health/");
    expect(fetch.mock.calls[0][1]).toHaveProperty("signal");
  });

  it("shows an error when the API returns an HTTP error", async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    render(<App />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Unable to connect to Django. Check that the backend is running and the API URL is correct."
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      "API unavailable"
    );
  });

  it("shows an error when the network request fails", async () => {
    fetch.mockRejectedValueOnce(new Error("Network error"));

    render(<App />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Unable to connect to Django. Check that the backend is running and the API URL is correct."
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      "API unavailable"
    );
  });
});
