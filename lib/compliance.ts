/** 诊断 / 处方类边界：固定合规话术，不走模型自由发挥 */
export function boundaryReply(text: string): string | null {
  if (/处方|开药|剂量|加量|减量|停药|换药|诊断|是不是癌|能不能治|预后|生存期|帮我决定/.test(text)) {
    return "这类问题涉及个体诊断或用药决定，数字医助不能在线给出结论。请记录症状出现时间、严重程度和已采取的措施，尽快联系主诊医生或线下就医。若情况紧急，请拨打当地急救电话。\n\n【AI 生成 · 仅供参考 · 非诊疗意见】";
  }
  return null;
}

export const AI_DISCLAIMER = "\n\n【AI 生成 · 仅供参考 · 非诊疗意见】";
