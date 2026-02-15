import { renderHook, waitFor } from "@testing-library/react";
import axios from "axios";
import useCategory from "./useCategory";

jest.mock("axios");

describe("useCategory Hook", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("fetches categories successfully and returns them", async () => {
    // Lum Yi Ren Johannsen, A0273503L
    // ARRANGE
    const mockCategory = [
      { _id: "1", name: "Test Cat", slug: "test-cat" },
    ];
    axios.get.mockResolvedValue({ data: { category: mockCategory } });

    // ACT
    const { result } = renderHook(() => useCategory());

    // ASSERT
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith("/api/v1/category/get-category");
    });
    await waitFor(() => {
      expect(result.current).toEqual(mockCategory);
    });
  });

  it("handles fetch error and keeps empty categories", async () => {
    // Lum Yi Ren Johannsen, A0273503L
    // ARRANGE (covers line 13 - catch block)
    const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    axios.get.mockRejectedValue(new Error("Network Error"));

    // ACT
    const { result } = renderHook(() => useCategory());

    // ASSERT
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith("/api/v1/category/get-category");
    });
    await waitFor(() => {
      expect(result.current).toEqual([]);
    });
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
