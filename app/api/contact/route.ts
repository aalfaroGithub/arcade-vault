import { NextResponse } from "next/server";
import { Resend } from "resend";

interface ContactRequestBody {
  name: string;
  email: string;
  msg: string;
}

type ContactResponse = { ok: true } | { ok: false; error: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const body = (await request.json()) as Partial<ContactRequestBody>;
  const name = body.name?.trim() ?? "";
  const email = body.email?.trim() ?? "";
  const msg = body.msg?.trim() ?? "";

  if (!name || !email || !msg || !EMAIL_RE.test(email)) {
    return NextResponse.json<ContactResponse>(
      { ok: false, error: "Datos inválidos." },
      { status: 400 },
    );
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json<ContactResponse>(
      { ok: false, error: "No se pudo enviar el mensaje." },
      { status: 500 },
    );
  }

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: "onboarding@resend.dev",
      to: "jorgeandres.alfaroalfaro@gmail.com",
      replyTo: email,
      subject: "Nuevo mensaje de contacto — Arcade Vault",
      text: `Nombre: ${name}\nEmail: ${email}\n\n${msg}`,
    });

    if (error) {
      return NextResponse.json<ContactResponse>(
        { ok: false, error: "No se pudo enviar el mensaje." },
        { status: 500 },
      );
    }

    return NextResponse.json<ContactResponse>({ ok: true });
  } catch {
    return NextResponse.json<ContactResponse>(
      { ok: false, error: "No se pudo enviar el mensaje." },
      { status: 500 },
    );
  }
}
