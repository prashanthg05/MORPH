const config = {
  default: {
    override: {
      wrapper: "cloudflare-node",
    },
  },
  middleware: {
    external: true,
    override: {
      wrapper: "cloudflare-edge",
    },
  },
};

export default config;