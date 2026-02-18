import { useDamageCalculator } from '~/composables/useDamageCalculator';

export const useItemMapper = () => {
    const config = useRuntimeConfig();
    const strapiUrl = config.public.strapi?.url || 'http://localhost:1337';
    const { calculateItemPower } = useDamageCalculator();

    const getImageUrl = (imgData: any): string => {
        if (!imgData) return '/assets/default-avatar.png';
        const data = imgData.data?.attributes || imgData.attributes || imgData;
        const url = data?.url;
        if (!url) return '/assets/default-avatar.png';
        if (url.startsWith('/')) return `${strapiUrl}${url}`;
        return url;
    };

    const mapSingleItem = (itemObj: any) => {
        if (!itemObj) return null;
        const item = itemObj.attributes || itemObj;
        const rawTags = item.tags?.data || item.tags || [];
        const tagList = rawTags.map((t: any) => (t.attributes?.name || t.name || '').toLowerCase());

        let rarityVal = 'common';
        if (item.rarity) {
            rarityVal = item.rarity.data?.attributes?.name || item.rarity.name || item.rarity;
        }

        const calculatedPower = calculateItemPower({
            index_damage: item.index_damage,
            level: item.level,
            rarity: rarityVal
        });

        return {
            id: item.id,
            documentId: item.documentId,
            level: item.level || 1,
            index_damage: item.index_damage || 0,
            rarity: String(rarityVal).toLowerCase(),
            category: item.slot || 'weapon',
            image: getImageUrl(item.icon),
            types: tagList,
            isScrapped: item.isScrapped || false,
            power: calculatedPower
        };
    };

    const mapItems = (itemsData: any) => {
        const rawItems = (itemsData?.data) ? itemsData.data : (itemsData || []);
        return rawItems.map(mapSingleItem).filter((i: any) => i !== null);
    };

    return {
        getImageUrl,
        mapSingleItem,
        mapItems
    };
};
