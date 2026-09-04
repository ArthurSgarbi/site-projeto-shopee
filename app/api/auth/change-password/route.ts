import {
  changePassword,
  clearSessionCookie,
  getSessionAdmin,
} from '@/lib/auth';
import { httpFailure, noStoreHeaders, readJson } from '@/lib/http-security';

export async function POST(request: Request) {
  try {
    const admin = await getSessionAdmin(request);
    if (!admin)
      return Response.json(
        { error: 'Sua sessão expirou. Entre novamente.' },
        { status: 401, headers: noStoreHeaders },
      );
    const body = (await readJson(request, 2_048)) as {
      currentPassword?: unknown;
      newPassword?: unknown;
      confirmPassword?: unknown;
    };
    if (
      typeof body.currentPassword !== 'string' ||
      typeof body.newPassword !== 'string' ||
      typeof body.confirmPassword !== 'string'
    )
      return Response.json(
        { error: 'Informe a senha atual e a nova senha.' },
        { status: 400, headers: noStoreHeaders },
      );
    if (
      body.currentPassword.length > 128 ||
      body.newPassword.length < 12 ||
      body.newPassword.length > 128
    )
      return Response.json(
        { error: 'A nova senha deve ter entre 12 e 128 caracteres.' },
        { status: 400, headers: noStoreHeaders },
      );
    if (body.currentPassword === body.newPassword)
      return Response.json(
        { error: 'A nova senha deve ser diferente da atual.' },
        { status: 400, headers: noStoreHeaders },
      );
    if (body.newPassword !== body.confirmPassword)
      return Response.json(
        { error: 'A confirmação não corresponde à nova senha.' },
        { status: 400, headers: noStoreHeaders },
      );
    const changed = await changePassword(
      admin,
      body.currentPassword,
      body.newPassword,
    );
    if (!changed)
      return Response.json(
        { error: 'Senha atual incorreta.' },
        { status: 401, headers: noStoreHeaders },
      );
    return Response.json(
      { changed: true },
      {
        headers: {
          ...noStoreHeaders,
          'Set-Cookie': clearSessionCookie(request),
        },
      },
    );
  } catch (error) {
    const failure = httpFailure(error);
    if (failure) return failure;
    console.error('[auth/change-password] Falha ao trocar senha.');
    return Response.json(
      { error: 'Não foi possível trocar a senha agora.' },
      { status: 503, headers: noStoreHeaders },
    );
  }
}
