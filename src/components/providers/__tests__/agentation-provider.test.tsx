import { render } from "@testing-library/react";
import { AgentationProvider } from "@/components/providers/agentation-provider";

describe("AgentationProvider", () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  it("renders Agentation in development", () => {
    process.env.NODE_ENV = "development";

    render(<AgentationProvider />);

    expect(document.querySelector('[data-feedback-toolbar="true"]')).toBeInTheDocument();
  });

  it("does not render Agentation outside development", () => {
    process.env.NODE_ENV = "production";

    render(<AgentationProvider />);

    expect(document.querySelector('[data-feedback-toolbar="true"]')).not.toBeInTheDocument();
  });
});
