import { describe, it, expect, beforeEach } from "vitest";
import { Storage } from "./storage.js";

beforeEach(() => localStorage.clear());

describe("Storage", () => {
  it("saves and retrieves projects", () => {
    const p = { id: "1", title: "Test", idea: "idea" };
    Storage.saveProject(p);
    expect(Storage.getProjects()).toHaveLength(1);
    expect(Storage.getProjects()[0].title).toBe("Test");
  });

  it("deletes a project", () => {
    Storage.saveProject({ id: "1", title: "A" });
    Storage.deleteProject("1");
    expect(Storage.getProjects()).toHaveLength(0);
  });

  it("saves and retrieves conversations", () => {
    Storage.saveConversation({ id: "c1", title: "Chat", messages: [{ role: "user", content: "hi" }] });
    const c = Storage.getConversations().find(x => x.id === "c1");
    expect(c.messages).toHaveLength(1);
  });

  it("saves agent config", () => {
    Storage.saveAgentConfig("bot1", { name: "Renamed", enabled: false });
    const cfg = Storage.getAgentConfigs();
    expect(cfg.bot1.name).toBe("Renamed");
    expect(cfg.bot1.enabled).toBe(false);
  });

  it("returns empty defaults", () => {
    expect(Storage.getProjects()).toEqual([]);
    expect(Storage.getConversations()).toEqual([]);
    expect(Storage.getAgentConfigs()).toEqual({});
  });
});