import { describe, expect, it } from "vitest";
import { isPrivateAddress } from "@/lib/private-address";

describe("isPrivateAddress", () => {
  it("deja pasar direcciones públicas, IPv4 e IPv6", () => {
    expect(isPrivateAddress("200.42.136.1")).toBe(false);
    expect(isPrivateAddress("151.101.1.1")).toBe(false);
    expect(isPrivateAddress("2606:4700::6810:84e5")).toBe(false);
    expect(isPrivateAddress("::ffff:200.42.136.1")).toBe(false);
  });

  it("bloquea redes internas, locales y lo que no es una dirección", () => {
    for (const address of ["127.0.0.1", "10.1.2.3", "172.16.5.4", "192.168.0.10", "169.254.169.254"]) {
      expect(isPrivateAddress(address)).toBe(true);
    }
    expect(isPrivateAddress("::1")).toBe(true);
    expect(isPrivateAddress("fd00::1")).toBe(true);
    expect(isPrivateAddress("::ffff:127.0.0.1")).toBe(true);
    expect(isPrivateAddress("no-es-ip")).toBe(true);
  });
});
