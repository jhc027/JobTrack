const KEY = "ap_password";

export const getPassword = (): string | null =>
  typeof window !== "undefined" ? localStorage.getItem(KEY) : null;

export const setPassword = (pw: string) => localStorage.setItem(KEY, pw);

export const clearPassword = () => localStorage.removeItem(KEY);

export async function testAuth(password: string): Promise<boolean> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/health`,
      { headers: { Authorization: `Bearer ${password}` } }
    );
    return res.ok;
  } catch {
    return false;
  }
}
