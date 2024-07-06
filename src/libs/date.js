
export function dateTimetoLocalDateString(date) {
    return new Date(date).toLocaleDateString("ja-JP", {year: "numeric", month: "2-digit", day: "2-digit"}).split("/").join("-");
}
