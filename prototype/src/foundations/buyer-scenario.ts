import {pricingPlanScopes} from './pricing-plans.ts';
import type {PricingOwnership} from './pricing-quote.ts';
export type BuyerScenario = 'new'|'product'|'expired'|'partial';
export function buyerScenarioOwnership(scenario:BuyerScenario):PricingOwnership {
 if(scenario==='new')return {itemIds:[]};
 if(scenario==='partial')return {itemIds:pricingPlanScopes.bundle.filter(id=>!pricingPlanScopes.product.some(product=>product===id))};
 return {itemIds:pricingPlanScopes.product,productNetPaidMinor:1600,coverage:[{itemIds:pricingPlanScopes.product,functionalUpdatesUntil:scenario==='expired'?'2026-01-31':'2027-03-31'}]};
}
export const buyerCardCopy={
 en:{ownedBadge:'Yours',owned:'Already owned',ownedAction:'View access',noRepeat:'No repeat payment',upgrade:'Upgrade to All packs',complete:'Complete this pack',newItems:'new materials',oldUpdates:'Functional updates ended. Your purchased code remains yours.',checking:'Checking purchases',view:'Review selection'},
 ru:{ownedBadge:'Ваш набор',owned:'Уже куплен',ownedAction:'Посмотреть доступ',noRepeat:'Без повторной оплаты',upgrade:'Доплатить до All packs',complete:'Дополнить набор',newItems:'новых материалов',oldUpdates:'Срок обновлений закончился. Купленный код остаётся у вас.',checking:'Проверяем покупки',view:'Посмотреть состав'},
 vi:{ownedBadge:'Đã mua',owned:'Đã sở hữu',ownedAction:'Xem quyền truy cập',noRepeat:'Không thanh toán lại',upgrade:'Nâng cấp lên All packs',complete:'Hoàn thiện bộ',newItems:'tài nguyên mới',oldUpdates:'Hết thời hạn cập nhật. Mã đã mua vẫn thuộc về bạn.',checking:'Đang kiểm tra giao dịch',view:'Xem lựa chọn'},
};
