import React from "react";
import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { Article, Aside, BlockHeader, BlockFooter, Table, Pre, Figure, Dl, Nav, Section, Main, Blockquote } from "../Semantic";
import { Container, Grid, Stack, Row } from "../Layout";

// Regression for bug #11: several components extend SurfaceProps (so
// TypeScript accepts paddingX/paddingY/overflow/roundedTop/roundedBottom)
// but never destructured them, so they fell into `...props` and were spread
// onto the DOM as invalid HTML attributes with zero visual effect.
describe("SurfaceProps fields are applied, not dropped onto the DOM (bug #11 regression)", () => {
  const cases: Array<{
    name: string;
    render: () => ReturnType<typeof render>;
    selector: string;
  }> = [
    {
      name: "Article",
      render: () =>
        render(
          <Article paddingX="x-lg" paddingY="y-lg" roundedTop="xl" roundedBottom="sm" overflow="hidden" data-testid="el">
            x
          </Article>,
        ),
      selector: '[data-testid="el"]',
    },
    {
      name: "Aside",
      render: () =>
        render(
          <Aside paddingX="x-lg" paddingY="y-lg" roundedTop="xl" roundedBottom="sm" overflow="hidden" data-testid="el">
            x
          </Aside>,
        ),
      selector: '[data-testid="el"]',
    },
    {
      name: "Nav",
      render: () =>
        render(
          <Nav aria-label="test" paddingX="x-lg" paddingY="y-lg" roundedTop="xl" roundedBottom="sm" overflow="hidden" data-testid="el">
            x
          </Nav>,
        ),
      selector: '[data-testid="el"]',
    },
    {
      name: "BlockHeader",
      render: () =>
        render(
          <BlockHeader paddingX="x-lg" paddingY="y-lg" roundedTop="xl" roundedBottom="sm" overflow="hidden" data-testid="el">
            x
          </BlockHeader>,
        ),
      selector: '[data-testid="el"]',
    },
    {
      name: "BlockFooter",
      render: () =>
        render(
          <BlockFooter paddingX="x-lg" paddingY="y-lg" roundedTop="xl" roundedBottom="sm" overflow="hidden" data-testid="el">
            x
          </BlockFooter>,
        ),
      selector: '[data-testid="el"]',
    },
    {
      name: "Table",
      render: () =>
        render(
          <Table paddingX="x-lg" paddingY="y-lg" roundedTop="xl" roundedBottom="sm" overflow="hidden" data-testid="el">
            <tbody>
              <tr>
                <td>x</td>
              </tr>
            </tbody>
          </Table>,
        ),
      selector: '[data-testid="el"]',
    },
    {
      name: "Pre",
      render: () =>
        render(
          <Pre paddingX="x-lg" paddingY="y-lg" roundedTop="xl" roundedBottom="sm" overflow="hidden" data-testid="el">
            x
          </Pre>,
        ),
      selector: '[data-testid="el"]',
    },
    {
      name: "Figure",
      render: () =>
        render(
          <Figure paddingX="x-lg" paddingY="y-lg" roundedTop="xl" roundedBottom="sm" overflow="hidden" data-testid="el">
            x
          </Figure>,
        ),
      selector: '[data-testid="el"]',
    },
    {
      name: "Dl",
      render: () =>
        render(
          <Dl paddingX="x-lg" paddingY="y-lg" roundedTop="xl" roundedBottom="sm" overflow="hidden" data-testid="el">
            x
          </Dl>,
        ),
      selector: '[data-testid="el"]',
    },
    {
      name: "Section",
      render: () =>
        render(
          <Section roundedTop="xl" roundedBottom="sm" overflow="hidden" data-testid="el">
            x
          </Section>,
        ),
      selector: '[data-testid="el"]',
    },
    {
      name: "Main",
      render: () =>
        render(
          <Main roundedTop="xl" roundedBottom="sm" overflow="hidden" data-testid="el">
            x
          </Main>,
        ),
      selector: '[data-testid="el"]',
    },
    {
      name: "Blockquote",
      render: () =>
        render(
          <Blockquote roundedTop="xl" roundedBottom="sm" overflow="hidden" data-testid="el">
            x
          </Blockquote>,
        ),
      selector: '[data-testid="el"]',
    },
    {
      name: "Container",
      render: () =>
        render(
          <Container paddingX="x-lg" paddingY="y-lg" roundedTop="xl" roundedBottom="sm" overflow="hidden" data-testid="el">
            x
          </Container>,
        ),
      selector: '[data-testid="el"]',
    },
    {
      name: "Grid",
      render: () =>
        render(
          <Grid paddingX="x-lg" paddingY="y-lg" roundedTop="xl" roundedBottom="sm" overflow="hidden" data-testid="el">
            x
          </Grid>,
        ),
      selector: '[data-testid="el"]',
    },
    {
      name: "Stack",
      render: () =>
        render(
          <Stack roundedTop="xl" roundedBottom="sm" overflow="hidden" data-testid="el">
            x
          </Stack>,
        ),
      selector: '[data-testid="el"]',
    },
    {
      name: "Row",
      render: () =>
        render(
          <Row roundedTop="xl" roundedBottom="sm" overflow="hidden" data-testid="el">
            x
          </Row>,
        ),
      selector: '[data-testid="el"]',
    },
  ];

  for (const { name, render: doRender, selector } of cases) {
    it(`${name} applies roundedTop/roundedBottom/overflow classes and does not leak them as DOM attributes`, () => {
      const { container } = doRender();
      const el = container.querySelector(selector)!;
      expect(el).not.toBeNull();
      expect(el.className).toContain("rounded-t-xl");
      expect(el.className).toContain("rounded-b-sm");
      expect(el.className).toContain("overflow-hidden");
      expect(el.hasAttribute("roundedtop")).toBe(false);
      expect(el.hasAttribute("roundedbottom")).toBe(false);
      expect(el.hasAttribute("overflow")).toBe(false);
    });
  }

  it("Article/Aside/Nav/BlockHeader/BlockFooter/Table/Pre/Figure/Dl/Container apply paddingX/paddingY classes and do not leak them as DOM attributes", () => {
    for (const { render: doRender, selector } of cases.filter((c) =>
      ["Article", "Aside", "Nav", "BlockHeader", "BlockFooter", "Table", "Pre", "Figure", "Dl", "Container", "Grid"].includes(c.name),
    )) {
      const { container } = doRender();
      const el = container.querySelector(selector)!;
      expect(el.className).toContain("px-[var(--appkit-space-6)]");
      expect(el.className).toContain("py-[var(--appkit-space-6)]");
      expect(el.hasAttribute("paddingx")).toBe(false);
      expect(el.hasAttribute("paddingy")).toBe(false);
    }
  });
});

describe("Nav gap scale is ascending (bug #12 regression)", () => {
  it("2xs renders a smaller gap than xs", () => {
    const { container: c1 } = render(
      <Nav aria-label="a" gap="2xs" data-testid="el">
        x
      </Nav>,
    );
    const { container: c2 } = render(
      <Nav aria-label="b" gap="xs" data-testid="el">
        x
      </Nav>,
    );
    expect(c1.querySelector('[data-testid="el"]')!.className).toContain("gap-1");
    expect(c1.querySelector('[data-testid="el"]')!.className).not.toContain("gap-1.5");
    expect(c2.querySelector('[data-testid="el"]')!.className).toContain("gap-1.5");
  });
});
