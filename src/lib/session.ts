const SESSION_COOKIE_NAME =
  "stockpro_session";

export const SESSION_DURATION_SECONDS =
  60 * 60 * 8;

export type SessionPayload = {
  userId: number;
  role: string;
  expiresAt: number;
};

/*
 * ==========================================
 * OBTENER SECRETO
 * ==========================================
 */

function getSecret() {
  const secret =
    process.env.SESSION_SECRET;

  if (!secret) {
    throw new Error(
      "SESSION_SECRET no está configurado en las variables de entorno."
    );
  }

  return secret;
}

/*
 * ==========================================
 * BASE64 URL
 * ==========================================
 */

function stringToBase64Url(
  value: string
) {
  const bytes =
    new TextEncoder().encode(
      value
    );

  let binary = "";

  bytes.forEach((byte) => {
    binary +=
      String.fromCharCode(byte);
  });

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlToString(
  value: string
) {
  let base64 = value
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  while (
    base64.length % 4
  ) {
    base64 += "=";
  }

  const binary =
    atob(base64);

  const bytes =
    Uint8Array.from(
      binary,
      (character) =>
        character.charCodeAt(0)
    );

  return new TextDecoder().decode(
    bytes
  );
}

function bytesToBase64Url(
  bytes: Uint8Array
) {
  let binary = "";

  bytes.forEach((byte) => {
    binary +=
      String.fromCharCode(byte);
  });

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

/*
 * ==========================================
 * CLAVE HMAC
 * ==========================================
 */

async function getHmacKey() {
  return crypto.subtle.importKey(
    "raw",

    new TextEncoder().encode(
      getSecret()
    ),

    {
      name: "HMAC",
      hash: "SHA-256",
    },

    false,

    [
      "sign",
      "verify",
    ]
  );
}

/*
 * ==========================================
 * CREAR TOKEN
 * ==========================================
 */

export async function createSessionToken(
  userId: number,
  role: string
) {
  const payload: SessionPayload = {
    userId,
    role,

    expiresAt:
      Date.now() +
      SESSION_DURATION_SECONDS *
        1000,
  };

  const encodedPayload =
    stringToBase64Url(
      JSON.stringify(
        payload
      )
    );

  const key =
    await getHmacKey();

  const signature =
    await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(
        encodedPayload
      )
    );

  const encodedSignature =
    bytesToBase64Url(
      new Uint8Array(
        signature
      )
    );

  return `${encodedPayload}.${encodedSignature}`;
}

/*
 * ==========================================
 * VALIDAR TOKEN
 * ==========================================
 */

export async function verifySessionToken(
  token?: string | null
): Promise<SessionPayload | null> {
  if (!token) {
    return null;
  }

  try {
    const parts =
      token.split(".");

    /*
     * El token debe contener exactamente:
     *
     * payload.firma
     */

    if (parts.length !== 2) {
      return null;
    }

    const [
      encodedPayload,
      encodedSignature,
    ] = parts;

    if (
      !encodedPayload ||
      !encodedSignature
    ) {
      return null;
    }

    /*
     * Convertir firma Base64URL
     */

    let signatureBase64 =
      encodedSignature
        .replace(/-/g, "+")
        .replace(/_/g, "/");

    while (
      signatureBase64.length %
      4
    ) {
      signatureBase64 += "=";
    }

    const signatureBinary =
      atob(
        signatureBase64
      );

    const signatureBytes =
      Uint8Array.from(
        signatureBinary,
        (character) =>
          character.charCodeAt(
            0
          )
      );

    /*
     * VALIDAR FIRMA HMAC
     */

    const key =
      await getHmacKey();

    const valid =
      await crypto.subtle.verify(
        "HMAC",

        key,

        signatureBytes,

        new TextEncoder().encode(
          encodedPayload
        )
      );

    if (!valid) {
      return null;
    }

    /*
     * DECODIFICAR PAYLOAD
     */

    const parsed =
      JSON.parse(
        base64UrlToString(
          encodedPayload
        )
      );

    /*
     * VALIDACIÓN ESTRICTA
     */

    if (
      typeof parsed !==
        "object" ||
      parsed === null
    ) {
      return null;
    }

    const payload =
      parsed as Partial<SessionPayload>;

    if (
      !Number.isInteger(
        payload.userId
      ) ||
      Number(payload.userId) <=
        0 ||
      typeof payload.role !==
        "string" ||
      !payload.role ||
      typeof payload.expiresAt !==
        "number" ||
      !Number.isFinite(
        payload.expiresAt
      )
    ) {
      return null;
    }

    /*
     * VALIDAR EXPIRACIÓN
     */

    if (
      payload.expiresAt <=
      Date.now()
    ) {
      return null;
    }

    return {
      userId:
        payload.userId as number,

      role:
        payload.role,

      expiresAt:
        payload.expiresAt,
    };
  } catch {
    return null;
  }
}

/*
 * ==========================================
 * NOMBRE DE COOKIE
 * ==========================================
 */

export function getSessionCookieName() {
  return SESSION_COOKIE_NAME;
}