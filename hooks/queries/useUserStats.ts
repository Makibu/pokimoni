import {useQuery} from '@tanstack/react-query'
import {useEffect, useState} from 'react'
import {UserStats} from '@/lib/types'

export const useUserStats = () => {
    const [uid, setUid] = useState<string | null>(null)

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user') || '{}')
        const storedUid = user.uid
        if (storedUid) setUid(storedUid)
    }, [])

    return useQuery<UserStats, Error>({
        queryKey: uid ? ['userStats', uid] : [],
        queryFn: async () => {
            const res = await fetch(`/api/user/stats?uid=${uid}`)
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Błąd pobierania statystyk')
            return data.userStats
        },
        enabled: !!uid,
    })
}
