import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { activityLabel } from "./admin-activity-label";

describe("admin activity labels", () => {
  it("uses Turkish labels for operational actions", () => {
    assert.equal(activityLabel("import.approve"), "Import yayınlandı");
    assert.equal(activityLabel("comment.status"), "Yorum durumu değiştirildi");
    assert.equal(activityLabel("category.sidebar_visibility.update"), "Kategori menü görünürlüğü güncellendi");
    assert.equal(activityLabel("category.reorder"), "Kategori sıralaması güncellendi");
    assert.equal(activityLabel("user.bulk_unblock"), "Kullanıcıların engeli kaldırıldı");
    assert.equal(activityLabel("unknown.action"), "Yönetim işlemi gerçekleştirildi");
  });
});
