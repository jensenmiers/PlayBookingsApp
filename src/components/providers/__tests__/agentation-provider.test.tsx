import { render, screen, waitFor } from "@testing-library/react";
import { AgentationProvider } from "@/components/providers/agentation-provider";

jest.mock("agentation", () => ({
  Agentation: () => <div data-testid="agentation-widget" />,
}));

describe("AgentationProvider", () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    Object.defineProperty(window.navigator, "webdriver", {
      configurable: true,
      value: undefined,
    });
  });

  it("renders Agentation in development", async () => {
    process.env.NODE_ENV = "development";

    render(<AgentationProvider />);

    await waitFor(() => {
      expect(screen.getByTestId("agentation-widget")).toBeInTheDocument();
    });
  });

  it("does not render Agentation outside development", () => {
    process.env.NODE_ENV = "production";

    render(<AgentationProvider />);

    expect(screen.queryByTestId("agentation-widget")).not.toBeInTheDocument();
  });

  it("does not render Agentation in automated browser sessions", async () => {
    process.env.NODE_ENV = "development";
    Object.defineProperty(window.navigator, "webdriver", {
      configurable: true,
      value: true,
    });

    render(<AgentationProvider />);

    await new Promise((resolve) => {
      setTimeout(resolve, 20);
    });

    expect(screen.queryByTestId("agentation-widget")).not.toBeInTheDocument();
  });
});
