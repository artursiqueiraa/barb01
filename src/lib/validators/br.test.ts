import { describe, expect, it } from "vitest";

import { isValidCPF, onlyDigits } from "./br";

describe("onlyDigits", () => {
  it("remove tudo que não é dígito", () => {
    expect(onlyDigits("123.456.789-09")).toBe("12345678909");
  });
});

describe("isValidCPF", () => {
  it("aceita um CPF com dígitos verificadores corretos", () => {
    expect(isValidCPF("11144477735")).toBe(true);
  });

  it("rejeita CPF com dígito verificador errado", () => {
    expect(isValidCPF("11144477736")).toBe(false);
  });

  it("rejeita sequência de dígitos repetidos", () => {
    expect(isValidCPF("11111111111")).toBe(false);
  });

  it("rejeita CPF com tamanho errado", () => {
    expect(isValidCPF("123")).toBe(false);
  });
});
