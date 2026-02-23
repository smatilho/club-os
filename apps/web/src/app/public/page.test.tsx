import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import PublicHome from "./page";

describe("PublicHome", () => {
  it("renders the public landing copy", () => {
    render(<PublicHome />);

    expect(
      screen.getByRole("heading", { name: "Welcome to Club OS" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Membership platform for your organization."),
    ).toBeInTheDocument();
  });
});
