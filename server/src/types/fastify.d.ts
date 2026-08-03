import "fastify";

declare module "fastify" {
  interface FastifyRequest {
    userId?: string;
    adminId?: string;
  }

  interface FastifyInstance {
    authenticate: (
      request: FastifyRequest,
      reply: FastifyReply
    ) => Promise<void>;
    authenticateAdmin: (
      request: FastifyRequest,
      reply: FastifyReply
    ) => Promise<void>;
  }
}
