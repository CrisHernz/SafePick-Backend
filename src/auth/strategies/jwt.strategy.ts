import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { AuthService } from "../auth.service";
import { SecretsService } from "../../config/secrets.service";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private authService: AuthService,
    private secretsService: SecretsService,
  ) {
    const secret = secretsService.getJwtSecret();
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret, // ✅ SECURE: Validated secret from SecretsService
    });
  }

  async validate(payload: any) {
    // Si es un picker temporal (tiene type: "temporary")
    if (payload.type === "temporary" && payload.role === "PICKER") {
      return {
        id: payload.sub,
        cedula: payload.cedula,
        role: payload.role,
        type: payload.type,
        orderId: payload.orderId,
      };
    }

    // Si es un usuario normal
    const user = await this.authService.validateUser(payload);
    if (!user) {
      throw new Error("User not found");
    }
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      institutionId: user.institutionId,
    };
  }
}
