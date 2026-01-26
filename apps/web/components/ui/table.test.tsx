import { render, screen, within } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
} from "./table";

describe("Table", () => {
  it("renders a table element", () => {
    render(
      <Table>
        <TableBody>
          <TableRow>
            <TableCell>Cell</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );
    expect(screen.getByRole("table")).toBeInTheDocument();
  });

  it("renders header cells correctly", () => {
    render(
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>John</TableCell>
            <TableCell>john@example.com</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );

    expect(
      screen.getByRole("columnheader", { name: /name/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: /email/i })
    ).toBeInTheDocument();
  });

  it("renders body cells correctly", () => {
    render(
      <Table>
        <TableBody>
          <TableRow>
            <TableCell>John Doe</TableCell>
            <TableCell>john@example.com</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Jane Doe</TableCell>
            <TableCell>jane@example.com</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );

    const rows = screen.getAllByRole("row");
    expect(rows).toHaveLength(2);
    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("jane@example.com")).toBeInTheDocument();
  });

  it("renders caption when provided", () => {
    render(
      <Table>
        <TableCaption>Member List</TableCaption>
        <TableBody>
          <TableRow>
            <TableCell>Data</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );

    expect(screen.getByText("Member List")).toBeInTheDocument();
  });

  it("has responsive overflow container", () => {
    const { container } = render(
      <Table>
        <TableBody>
          <TableRow>
            <TableCell>Cell</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );

    // Table should be wrapped in overflow container (overflow-x-auto)
    const wrapper = container.querySelector('[class*="overflow"]');
    expect(wrapper).toBeInTheDocument();
    expect(within(wrapper as HTMLElement).getByRole("table")).toBeInTheDocument();
  });

  it("applies custom className to table", () => {
    render(
      <Table className="custom-class">
        <TableBody>
          <TableRow>
            <TableCell>Cell</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );

    expect(screen.getByRole("table")).toHaveClass("custom-class");
  });
});
