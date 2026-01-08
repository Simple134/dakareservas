import { NextRequest, NextResponse } from 'next/server';
import { v2GetPendingRecords } from '@/src/lib/gestiono/endpoints';
import type { V2GetPendingRecordsQuery } from '@/src/types/gestiono';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const query: any = {};

        searchParams.forEach((value, key) => {
            if (value === 'true') {
                query[key] = true;
            } else if (value === 'false') {
                query[key] = false;
            } else if (!isNaN(Number(value)) && !['month', 'year', 'taxId', 'phone', 'reference'].includes(key)) {
                query[key] = Number(value);
            } else if (value.startsWith('[') || value.startsWith('{')) {
                try {
                    query[key] = JSON.parse(value);
                } catch {
                    query[key] = value;
                }
            } else {
                query[key] = value;
            }
        });

        console.log('📍 Calling v2GetPendingRecords with params:', query);

        const pendingRecords = await v2GetPendingRecords(query);
        console.log('✅ v2GetPendingRecords obtenidas:', pendingRecords);
        return NextResponse.json(pendingRecords);
    } catch (error: any) {
        console.error('❌ Error fetching v2GetPendingRecords:', error);
        console.error('📋 Error details:', {
            message: error.message,
            statusCode: error.statusCode,
            msg: error.msg,
            details: error.details,
        });
        return NextResponse.json(
            {
                error: 'Failed to fetch v2GetPendingRecords',
                details: error.message || error.msg,
                gestionoError: error
            },
            { status: 500 }
        );
    }
}
