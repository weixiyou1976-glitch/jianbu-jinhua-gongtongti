// TODO: 傲龙提供真实头像图片后，把下面的 AVATAR_URL 换成图片地址即可全站生效
const AVATAR_URL = null;

export default function AoLongAvatar({ size = 32, className = '' }) {
  if (AVATAR_URL) {
    return (
      <img
        src={AVATAR_URL}
        alt="傲龙"
        style={{ width: size, height: size }}
        className={`rounded-full object-cover shrink-0 ${className}`}
      />
    );
  }
  return (
    <div
      style={{ width: size, height: size, fontSize: size * 0.5 }}
      className={`rounded-full bg-vermilion text-paper flex items-center justify-center font-bold shrink-0 ${className}`}
    >
      龙
    </div>
  );
}
