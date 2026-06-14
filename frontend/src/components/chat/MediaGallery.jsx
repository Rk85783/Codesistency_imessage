import { useEffect, useState } from "react";
import { Button, Modal } from "@heroui/react";
import { withTransform } from "../../lib/imagekit";
import { useChatStore } from "../../store/useChatStore";
import { LoaderIcon, PlayIcon, XIcon } from "lucide-react";

const THUMB_TRANSFORM = "q-auto,w-300,h-300,f-auto";

export function MediaGallery({ isOpen, onClose, userId }) {
  const mediaGallery = useChatStore((state) => state.mediaGallery);
  const isMediaGalleryLoading = useChatStore((state) => state.isMediaGalleryLoading);
  const getMediaGallery = useChatStore((state) => state.getMediaGallery);

  const [selectedMedia, setSelectedMedia] = useState(null);

  useEffect(() => {
    if (isOpen && userId) {
      getMediaGallery(userId);
      setSelectedMedia(null);
    }
  }, [isOpen, userId, getMediaGallery]);

  return (
    <>
      <Modal.Root isOpen={isOpen} onOpenChange={onClose}>
        <Modal.Container className="max-w-2xl">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading className="text-lg font-semibold">Shared Media</Modal.Heading>
              <Modal.CloseTrigger>
                <Button variant="ghost" size="sm" isIconOnly className="size-7">
                  <XIcon className="size-4" />
                </Button>
              </Modal.CloseTrigger>
            </Modal.Header>
            <Modal.Body>
              {isMediaGalleryLoading ? (
                <div className="flex justify-center py-12">
                  <LoaderIcon className="size-6 animate-spin text-muted" />
                </div>
              ) : mediaGallery.length === 0 ? (
                <p className="py-12 text-center text-sm text-muted">No shared media yet.</p>
              ) : (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {mediaGallery.map((item) => (
                    <button
                      key={item._id}
                      type="button"
                      onClick={() => setSelectedMedia(item)}
                      className="group relative aspect-square overflow-hidden rounded-lg bg-foreground/5"
                    >
                      {item.type === "video" ? (
                        <>
                          <img
                            src={withTransform(item.thumbnail || item.url, THUMB_TRANSFORM)}
                            alt=""
                            className="size-full object-cover"
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                            <PlayIcon className="size-8 text-white" fill="white" />
                          </div>
                        </>
                      ) : (
                        <img
                          src={withTransform(item.url, THUMB_TRANSFORM)}
                          alt=""
                          className="size-full object-cover"
                        />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </Modal.Body>
            <Modal.Footer>
              <Button variant="ghost" onPress={onClose}>
                Close
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Root>

      <Modal.Root isOpen={!!selectedMedia} onOpenChange={() => setSelectedMedia(null)}>
        <Modal.Container className="max-w-3xl">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.CloseTrigger>
                <Button variant="ghost" size="sm" isIconOnly className="size-7">
                  <XIcon className="size-4" />
                </Button>
              </Modal.CloseTrigger>
            </Modal.Header>
            <Modal.Body className="flex items-center justify-center p-0">
              {selectedMedia?.type === "video" ? (
                <video
                  src={selectedMedia.url}
                  controls
                  autoPlay
                  className="max-h-[70vh] w-full rounded-lg"
                />
              ) : selectedMedia ? (
                <img
                  src={withTransform(selectedMedia.url, "q-auto,w-1200")}
                  alt=""
                  className="max-h-[70vh] w-full rounded-lg object-contain"
                />
              ) : null}
            </Modal.Body>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Root>
    </>
  );
}
