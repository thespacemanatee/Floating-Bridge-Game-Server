export const getUserColor = (id: string) =>
  "hsl(" + (hashCode(id) % 360) + ",70%,60%)";

const hashCode = (s: string) =>
  s.split("").reduce((a, b) => {
    a = (a << 5) - a + b.charCodeAt(0);
    return a & a;
  }, 0);
