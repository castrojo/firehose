/**
 * Feed Configuration for The Firehose
 * 
 * This file contains all CNCF project GitHub release feeds.
 * Feeds are organized by project maturity level (Graduated, Incubating).
 * 
 * Structure:
 * - url: GitHub Atom feed URL (required)
 * - project: Optional project name override (defaults to landscape match)
 */

export interface FeedConfig {
  url: string;
  project?: string;
}

/**
 * All CNCF project release feeds
 * Extracted from osmosfeed.yaml and filtered to GitHub releases only
 */
const feeds: FeedConfig[] = [
  // CNCF Graduated Projects
  { url: 'https://github.com/argoproj/argo-cd/releases.atom' },
  { url: 'https://github.com/cert-manager/cert-manager/releases.atom' },
  { url: 'https://github.com/cilium/cilium/releases.atom' },
  { url: 'https://github.com/cloudevents/spec/releases.atom' },
  { url: 'https://github.com/containerd/containerd/releases.atom' },
  { url: 'https://github.com/coredns/coredns/releases.atom' },
  { url: 'https://github.com/cri-o/cri-o/releases.atom' },
  { url: 'https://github.com/crossplane/crossplane/releases.atom' },
  { url: 'https://github.com/cubeFS/cubefs/releases.atom' },
  { url: 'https://github.com/dapr/dapr/releases.atom' },
  { url: 'https://github.com/dragonflyoss/dragonfly/releases.atom' },
  { url: 'https://github.com/envoyproxy/envoy/releases.atom' },
  { url: 'https://github.com/etcd-io/etcd/releases.atom' },
  { url: 'https://github.com/falcosecurity/falco/releases.atom' },
  { url: 'https://github.com/fluent/fluentd/releases.atom' },
  { url: 'https://github.com/fluxcd/flux2/releases.atom' },
  { url: 'https://github.com/goharbor/harbor/releases.atom' },
  { url: 'https://github.com/grpc/grpc/releases.atom' },
  { url: 'https://github.com/helm/helm/releases.atom' },
  { url: 'https://github.com/in-toto/in-toto/releases.atom' },
  { url: 'https://github.com/istio/istio/releases.atom' },
  { url: 'https://github.com/jaegertracing/jaeger/releases.atom' },
  { url: 'https://github.com/kedacore/keda/releases.atom' },
  { url: 'https://github.com/knative/serving/releases.atom' },
  { url: 'https://github.com/kubeedge/kubeedge/releases.atom' },
  { url: 'https://github.com/kubernetes/kubernetes/releases.atom' },
  { url: 'https://github.com/linkerd/linkerd2/releases.atom' },
  { url: 'https://github.com/open-policy-agent/opa/releases.atom' },
  { url: 'https://github.com/prometheus/prometheus/releases.atom' },
  { url: 'https://github.com/rook/rook/releases.atom' },
  { url: 'https://github.com/spiffe/spiffe/releases.atom' },
  { url: 'https://github.com/spiffe/spire/releases.atom' },
  { url: 'https://github.com/theupdateframework/python-tuf/releases.atom' },
  { url: 'https://github.com/tikv/tikv/releases.atom' },
  { url: 'https://github.com/vitessio/vitess/releases.atom' },
  
  // CNCF Incubating Projects
  { url: 'https://github.com/backstage/backstage/releases.atom' },
  { url: 'https://github.com/buildpacks/pack/releases.atom' },
  { url: 'https://github.com/chaos-mesh/chaos-mesh/releases.atom' },
  { url: 'https://github.com/cloud-custodian/cloud-custodian/releases.atom' },
  { url: 'https://github.com/containernetworking/cni/releases.atom' },
  { url: 'https://github.com/projectcontour/contour/releases.atom' },
  { url: 'https://github.com/cortexproject/cortex/releases.atom' },
  { url: 'https://github.com/emissary-ingress/emissary/releases.atom' },
  { url: 'https://github.com/karmada-io/karmada/releases.atom' },
  { url: 'https://github.com/keycloak/keycloak/releases.atom' },
  { url: 'https://github.com/kserve/kserve/releases.atom' },
  { url: 'https://github.com/kubevela/kubevela/releases.atom' },
  { url: 'https://github.com/kubevirt/kubevirt/releases.atom' },
  { url: 'https://github.com/kubeflow/kubeflow/releases.atom' },
  { url: 'https://github.com/kyverno/kyverno/releases.atom' },
  { url: 'https://github.com/litmuschaos/litmus/releases.atom' },
  { url: 'https://github.com/longhorn/longhorn/releases.atom' },
  { url: 'https://github.com/metal3-io/baremetal-operator/releases.atom' },
  { url: 'https://github.com/nats-io/nats-server/releases.atom' },
  { url: 'https://github.com/notaryproject/notary/releases.atom' },
  { url: 'https://github.com/open-feature/spec/releases.atom' },
  { url: 'https://github.com/openkruise/kruise/releases.atom' },
  { url: 'https://github.com/open-telemetry/opentelemetry-collector/releases.atom' },
  { url: 'https://github.com/operator-framework/operator-sdk/releases.atom' },
  { url: 'https://github.com/strimzi/strimzi-kafka-operator/releases.atom' },
  { url: 'https://github.com/thanos-io/thanos/releases.atom' },
  { url: 'https://github.com/volcano-sh/volcano/releases.atom' },
];

export default feeds;
