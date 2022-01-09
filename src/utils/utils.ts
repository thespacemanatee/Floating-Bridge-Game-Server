import Pusher from "pusher";

const hashCode = (s: string) =>
  s.split("").reduce((a, b) => {
    a = (a << 5) - a + b.charCodeAt(0);
    return a & a;
  }, 0);

export const getUserColor = (id: string) =>
  "hsl(" + (hashCode(id) % 360) + ",70%,60%)";

export const groupBy = (items: any, key: any) =>
  items.reduce(
    (result: any, item: any) => ({
      ...result,
      [item[key]]: [...(result[item[key]] || []), item],
    }),
    {}
  );

export const getChannelUsers = async (pusher: Pusher, channelName: string) => {
  const res = await pusher.get({
    path: `/channels/${channelName}/users`,
  });
  if (res.status === 200) {
    const body: any = await res.json();
    return body.users;
  }
};
