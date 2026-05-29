import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GenerateBar } from "@/components/cinematic/GenerateBar";

describe("GenerateBar", () => {
  it("renders the input and button", () => {
    render(<GenerateBar loading={false} onGenerate={vi.fn()} />);
    expect(screen.getByPlaceholderText(/describe a pipeline…/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /generate/i })).toBeInTheDocument();
  });

  it("calls onGenerate with input value when form is submitted", () => {
    const handleGenerate = vi.fn();
    render(<GenerateBar loading={false} onGenerate={handleGenerate} />);
    
    const input = screen.getByPlaceholderText(/describe a pipeline…/i);
    const form = input.closest("form");
    
    fireEvent.change(input, { target: { value: "A new CRM" } });
    fireEvent.submit(form!);
    
    expect(handleGenerate).toHaveBeenCalledWith("A new CRM");
  });

  it("disables input and button when loading is true", () => {
    render(<GenerateBar loading={true} onGenerate={vi.fn()} />);
    
    const input = screen.getByPlaceholderText(/describe a pipeline…/i);
    const button = screen.getByRole("button");
    
    expect(input).toBeDisabled();
    expect(button).toBeDisabled();
  });

  it("does not call onGenerate if input is empty", () => {
    const handleGenerate = vi.fn();
    render(<GenerateBar loading={false} onGenerate={handleGenerate} />);
    
    const form = screen.getByPlaceholderText(/describe a pipeline…/i).closest("form");
    fireEvent.submit(form!);
    
    expect(handleGenerate).not.toHaveBeenCalled();
  });
});
