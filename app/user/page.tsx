"use client";

import {LoginClient} from "@/src/components/LoginClient";
import { useState } from "react";

type AuthInputs = {
    email: string;
    password: string;
    fullName?: string;
};

export default function UserPage() {
    const [user, setUser] = useState<any>(null);

    if (user) {
        return <LoginClient user={user} />
    }

    return (
        <div>
            <h1>Usuario no autenticado</h1>
        </div>
    );
}